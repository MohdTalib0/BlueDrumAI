import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkUsageLimit, checkStorageLimit, incrementUsageSimple, limitReachedResponse } from '../_shared/subscription.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userId = await getUserId(req)
    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const supabase = createSupabaseClient(req)

    // GET /entries - Get all vault entries
    if (url.pathname.endsWith('/entries') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('vault_entries')
        .select('id, user_id, type, module, file_url, file_hash, encrypted, metadata, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, entries: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /entry/:id - Get specific entry
    if (url.pathname.includes('/entry/') && req.method === 'GET') {
      const entryId = url.pathname.split('/entry/')[1]
      const { data, error } = await supabase
        .from('vault_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Entry not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, entry: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /upload - Upload file (handles multipart/form-data)
    if (url.pathname.endsWith('/upload') && req.method === 'POST') {
      const formData = await req.formData()
      const file = formData.get('file') as File
      const type = formData.get('type') as string
      const module = formData.get('module') as string
      const description = formData.get('description') as string || null
      const fileHash = formData.get('file_hash') as string || null
      const isEncrypted = formData.get('encrypted') === 'true'
      const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {}

      if (!file) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check subscription limits (file count + storage)
      const uploadLimit = await checkUsageLimit(userId, 'vault_uploads')
      if (!uploadLimit.allowed) return limitReachedResponse('vault_uploads', uploadLimit, corsHeaders)

      const storageLimit = await checkStorageLimit(userId, file.size)
      if (!storageLimit.allowed) return limitReachedResponse('storage', storageLimit, corsHeaders)

      // Upload to Supabase Storage
      // Path inside the bucket: userId/timestamp.ext (bucket name is already 'vault-files')
      const fileExt = file.name.split('.').pop()
      const storagePath = `${userId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('vault-files')
        .upload(storagePath, file, {
          contentType: isEncrypted ? 'application/octet-stream' : file.type,
          upsert: false,
        })

      if (uploadError) {
        return new Response(
          JSON.stringify({ ok: false, error: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('vault-files').getPublicUrl(storagePath)

      // Save entry to database (schema has: file_url, file_hash, encrypted, description, metadata)
      const { data: entryData, error: dbError } = await supabase
        .from('vault_entries')
        .insert({
          user_id: userId,
          type: type || 'document',
          module: module || 'male',
          file_url: urlData.publicUrl,
          file_hash: fileHash,
          encrypted: isEncrypted,
          description: description,
          metadata: metadata,
          file_size: file.size || null,
        })
        .select()
        .single()

      if (dbError) {
        return new Response(
          JSON.stringify({ ok: false, error: dbError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await incrementUsageSimple(userId, 'vault_uploads').catch(() => {})

      return new Response(
        JSON.stringify({ ok: true, entry: entryData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /entry/:id - Delete entry
    if (url.pathname.includes('/entry/') && req.method === 'DELETE') {
      const entryId = url.pathname.split('/entry/')[1]

      // Get entry first to get file URL for storage cleanup
      const { data: entry } = await supabase
        .from('vault_entries')
        .select('file_url')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single()

      // Extract storage path from public URL and delete from storage
      if (entry?.file_url) {
        // URL format: .../storage/v1/object/public/vault-files/userId/timestamp.ext
        const urlParts = entry.file_url.split('/vault-files/')
        if (urlParts.length > 1) {
          const storagePath = urlParts[urlParts.length - 1]
          await supabase.storage.from('vault-files').remove([storagePath])
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('vault_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId)

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Vault function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

