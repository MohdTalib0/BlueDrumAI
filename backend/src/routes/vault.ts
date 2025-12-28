import express from 'express'
import multer from 'multer'
import { requireAuth, getUserId } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'
import { extractMetadata } from '../utils/metadataExtractor'
import { uploadToStorage, deleteFromStorage, generateFilePath, getSignedUrl } from '../services/storage'
import { logAuditEvent, logUserActivity } from '../middleware/auditLogger'
import { z } from 'zod'

const router = express.Router()

// Configure multer for memory storage (we'll process files in memory before uploading to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Allow images, PDFs, and common document types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`))
    }
  },
})

/**
 * POST /api/vault/upload
 * Upload a file to the vault
 */
router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const userId = getUserId(req)
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' })
      }

      if (!req.file) {
        return res.status(400).json({ ok: false, error: 'No file provided' })
      }

      // Parse request body for additional metadata
      const bodySchema = z.object({
        type: z.enum(['photo', 'document', 'ticket', 'receipt', 'other']),
        description: z.string().max(1000).optional(),
        module: z.enum(['male', 'female']).default('male'),
      })

      const parsed = bodySchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        })
      }

      // Ensure user exists in users table (id matches auth.uid())
      const { data: user } = await supabaseAdmin.from('users').select('id').eq('id', userId).single()

      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found in database' })
      }

      // Extract metadata
      const metadata = await extractMetadata(req.file, req.file.buffer)

      // Generate file path
      const filePath = generateFilePath(user.id, req.file.originalname)

      // Upload to Supabase Storage
      const { fileUrl } = await uploadToStorage('vault-files', filePath, req.file.buffer, req.file.mimetype)

      // Save entry to database
      const { data: entry, error: dbError } = await supabaseAdmin
        .from('vault_entries')
        .insert({
          user_id: user.id,
          type: parsed.data.type,
          module: parsed.data.module,
          file_url: fileUrl,
          file_hash: metadata.hash,
          encrypted: false, // TODO: Implement encryption
          metadata: {
            ...metadata,
            description: parsed.data.description,
          },
          description: parsed.data.description,
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error inserting vault entry:', dbError)
        // If DB insert fails, try to delete uploaded file
        await deleteFromStorage('vault-files', filePath).catch(() => {})
        throw dbError
      }

      console.log(`[Vault] Created entry ${entry.id} for user ${user.id}`)

      // Log audit event
      await logAuditEvent(req, 'create', 'vault_entry', entry.id, {
        after: {
          type: entry.type,
          module: entry.module,
          file_hash: entry.file_hash,
        },
      }).catch(() => {})

      // Log user activity
      await logUserActivity(req, 'file_upload', {
        file_type: entry.type,
        file_size: metadata.size,
        file_hash: metadata.hash,
      }).catch(() => {})

      return res.json({
        ok: true,
        entry,
      })
    } catch (error: any) {
      return next(error)
    }
  },
)

/**
 * GET /api/vault/entries
 * Get all vault entries for the authenticated user
 */
router.get('/entries', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    // Get user's Supabase user ID
    const { data: user } = await supabaseAdmin.from('users').select('id').eq('id', userId).single()

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    // Query parameters
    const type = req.query.type as string | undefined
    const module = req.query.module as 'male' | 'female' | undefined

    let query = supabaseAdmin.from('vault_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    if (module) {
      query = query.eq('module', module)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching vault entries:', error)
      throw error
    }

    console.log(`[Vault] Fetched ${entries?.length || 0} entries for user ${user.id}`)

    // Generate fresh signed URLs for all entries (private bucket requires signed URLs)
    const entriesWithSignedUrls = await Promise.all(
      (entries || []).map(async (entry) => {
        // Extract file path from stored URL
        const filePathMatch = entry.file_url.match(/vault-files\/(.+)$/) || entry.file_url.match(/\/vault-files\/(.+)$/)
        if (filePathMatch) {
          try {
            const signedUrl = await getSignedUrl('vault-files', filePathMatch[1], 3600) // 1 hour expiry
            return { ...entry, file_url: signedUrl }
          } catch (urlError) {
            console.error(`Failed to generate signed URL for entry ${entry.id}:`, urlError)
            return entry // Return entry with original URL (might be expired)
          }
        }
        return entry
      }),
    )

    return res.json({
      ok: true,
      entries: entriesWithSignedUrls,
    })
  } catch (error: any) {
    return next(error)
  }
})

/**
 * GET /api/vault/entry/:id
 * Get a specific vault entry
 */
router.get('/entry/:id', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    // Get user's Supabase user ID
    const { data: user } = await supabaseAdmin.from('users').select('id').eq('id', userId).single()

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    const { data: entry, error } = await supabaseAdmin
      .from('vault_entries')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', user.id) // Ensure user owns this entry
      .single()

    if (error || !entry) {
      return res.status(404).json({ ok: false, error: 'Entry not found' })
    }

    // Generate fresh signed URL for private bucket access
    // Extract file path from stored URL
    const filePathMatch = entry.file_url.match(/vault-files\/(.+)$/) || entry.file_url.match(/\/vault-files\/(.+)$/)
    if (filePathMatch) {
      try {
        const signedUrl = await getSignedUrl('vault-files', filePathMatch[1], 3600) // 1 hour expiry
        entry.file_url = signedUrl
      } catch (urlError) {
        console.error('Failed to generate signed URL:', urlError)
        // Continue with existing URL (might be expired, but better than nothing)
      }
    }

    return res.json({
      ok: true,
      entry,
    })
  } catch (error: any) {
    return next(error)
  }
})

/**
 * DELETE /api/vault/entry/:id
 * Delete a vault entry and its file
 */
router.delete('/entry/:id', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    // Get user's Supabase user ID
    const { data: user } = await supabaseAdmin.from('users').select('id').eq('id', userId).single()

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    // Get entry first to verify ownership and get file path
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('vault_entries')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !entry) {
      return res.status(404).json({ ok: false, error: 'Entry not found' })
    }

    // Extract file path from URL (format: https://.../storage/v1/object/public/vault-files/path)
    const filePathMatch = entry.file_url.match(/vault-files\/(.+)$/)
    if (filePathMatch) {
      await deleteFromStorage('vault-files', filePathMatch[1]).catch((err) => {
        console.error('Failed to delete file from storage:', err)
        // Continue with DB deletion even if storage deletion fails
      })
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('vault_entries')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', user.id)

    if (deleteError) {
      throw deleteError
    }

    return res.json({
      ok: true,
      message: 'Entry deleted successfully',
    })
  } catch (error: any) {
    return next(error)
  }
})

export default router

