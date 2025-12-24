import express from 'express'
import { requireAuth, getUserId, getUserEmail } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'
import { logAuditEvent, logUserActivity } from '../middleware/auditLogger'
import { trackSignup } from '../services/analytics'

const router = express.Router()

/**
 * Sync user from Clerk to Supabase
 * Creates entry in public.users table
 * Uses Clerk's official Third-Party Auth integration with Supabase
 * Storage RLS policies use Clerk JWT claims (auth.jwt()->>'sub')
 */
router.post('/sync-user', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const authUserId = getUserId(req)
    const email = await getUserEmail(req)

    if (!authUserId || !email) {
      return res.status(400).json({ ok: false, error: 'Missing user information' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Upsert user in public.users table
    // Users.id should match auth.uid()
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .upsert(
        [
          {
            id: authUserId,
            email: normalizedEmail,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'id' },
      )
      .select()
      .single()

    if (error) {
      console.error('Failed to sync user:', error)
      return res.status(500).json({ ok: false, error: 'Failed to sync user' })
    }

    await logAuditEvent(req, 'create', 'user', user.id, { after: user }).catch(() => {})
    await logUserActivity(req, 'user_synced', { auth_user_id: authUserId, email: normalizedEmail }).catch(() => {})

    return res.json({ ok: true, user })
  } catch (error: any) {
    console.error('Sync user error:', error)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
})

/**
 * Get current user profile
 */
router.get('/me', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const authUserId = getUserId(req)

    if (!authUserId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single()

    if (error || !user) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    return res.json({ ok: true, user })
  } catch (error: any) {
    console.error('Get user error:', error)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
})

/**
 * Update user profile (gender, relationship status, onboarding)
 * Auto-syncs user from Clerk if they don't exist in Supabase
 */
router.patch('/me', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const authUserId = getUserId(req)
    const email = await getUserEmail(req)
    const { gender, relationship_status, onboarding_completed } = req.body

    if (!authUserId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    // Check if user exists in Supabase
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .single()

    // If user doesn't exist, sync from auth payload
    if (!existingUser) {
      if (!email) {
        console.error('Failed to get email for user:', authUserId)
        return res.status(400).json({ ok: false, error: 'Missing user email for sync. Please ensure your email is verified.' })
      }

      // Sync user into public.users (id must match auth.uid())
      const normalizedEmail = email.toLowerCase().trim()
      const { data: syncedUser, error: syncError } = await supabaseAdmin
        .from('users')
        .upsert(
          [
            {
              id: authUserId,
              email: normalizedEmail,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'id' },
        )
        .select()
        .single()

      if (syncError || !syncedUser) {
        console.error('Failed to sync user:', syncError)
        return res.status(500).json({ ok: false, error: 'Failed to sync user' })
      }

      // Track signup if this is a new user
      await trackSignup(authUserId, email, req.headers['referer']?.toString()).catch(() => {})
    }

    // Now update the user profile
    const updates: Record<string, unknown> = {}
    if (gender !== undefined) updates.gender = gender
    if (relationship_status !== undefined) updates.relationship_status = relationship_status
    if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: 'No fields to update' })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', authUserId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update user:', error)
      return res.status(500).json({ ok: false, error: 'Failed to update user' })
    }

    // Log audit event
    await logAuditEvent(req, 'update', 'user', user.id, {
      before: existingUser || null,
      after: user,
    })

    // Log user activity
    await logUserActivity(req, 'profile_update', {
      fields_updated: Object.keys(updates),
    })

    return res.json({ ok: true, user })
  } catch (error: any) {
    console.error('Update user error:', error)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
})

export default router

