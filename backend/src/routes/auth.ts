import express from 'express'
import { requireAuth, getUserId, getUserEmail } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'
import { logAuditEvent, logUserActivity } from '../middleware/auditLogger'
import { trackSignup } from '../services/analytics'

const router = express.Router()

/**
 * Helper function to sync user data from Supabase Auth
 */
async function syncUserFromAuth(userId: string, req: express.Request, incrementLogin = false) {
  try {
    // Fetch full user data from Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (authError || !authUser?.user) {
      console.error('Failed to fetch auth user:', authError)
      return null
    }

    const authData = authUser.user
    const metadata = authData.user_metadata || {}
    const firstName = metadata.first_name || metadata.firstName || null
    const lastName = metadata.last_name || metadata.lastName || null
    const emailVerified = !!authData.email_confirmed_at
    const source = metadata.source || req.headers['x-source'] || 'web'
    
    // Extract UTM parameters
    const utmSource = req.query.utm_source as string || req.headers['x-utm-source'] as string || metadata.utm_source || null
    const utmMedium = req.query.utm_medium as string || req.headers['x-utm-medium'] as string || metadata.utm_medium || null
    const utmCampaign = req.query.utm_campaign as string || req.headers['x-utm-campaign'] as string || metadata.utm_campaign || null
    const referrer = req.headers.referer || req.headers.referrer || metadata.referrer || null

    // Get existing user data
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('login_count, metadata')
      .eq('id', userId)
      .single()

    const currentLoginCount = existingUser?.login_count || 0
    const existingMetadata = existingUser?.metadata || {}

    // Merge metadata
    const mergedMetadata = {
      ...existingMetadata,
      ...metadata,
      last_sync: new Date().toISOString(),
    }

    // Upsert user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .upsert(
        [
          {
            id: userId,
            email: authData.email?.toLowerCase().trim() || null,
            first_name: firstName,
            last_name: lastName,
            email_verified: emailVerified,
            login_count: incrementLogin ? currentLoginCount + 1 : currentLoginCount,
            source: source,
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
            referrer: referrer,
            metadata: mergedMetadata,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'id' },
      )
      .select()
      .single()

    if (error) {
      console.error('Failed to sync user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Sync user error:', error)
    return null
  }
}

/**
 * Sync user from Supabase Auth to public.users table
 * Fetches full user data from auth.users and syncs to public.users
 * Includes: first_name, last_name, email_verified, login_count, etc.
 */
router.post('/sync-user', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const authUserId = getUserId(req)

    if (!authUserId) {
      return res.status(400).json({ ok: false, error: 'Missing user information' })
    }

    // Sync user from auth (increments login count)
    const user = await syncUserFromAuth(authUserId, req, true)

    if (!user) {
      return res.status(500).json({ ok: false, error: 'Failed to sync user' })
    }

    await logAuditEvent(req, 'create', 'user', user.id, { after: user }).catch(() => {})
    await logUserActivity(req, 'user_synced', { auth_user_id: authUserId, email: user.email }).catch(() => {})

    return res.json({ ok: true, user })
  } catch (error: any) {
    console.error('Sync user error:', error)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
})

/**
 * Get current user profile
 * Auto-syncs user data from Supabase Auth if needed
 */
router.get('/me', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const authUserId = getUserId(req)

    if (!authUserId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    // Try to get user from database
    let { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single()

    // If user doesn't exist or email_verified is outdated, sync from auth
    if (error || !user || user.email_verified === false) {
      const syncedUser = await syncUserFromAuth(authUserId, req, false)
      if (syncedUser) {
        user = syncedUser
      } else if (error) {
        return res.status(404).json({ ok: false, error: 'User not found' })
      }
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
      const email = await getUserEmail(req)
      if (!email) {
        console.error('Failed to get email for user:', authUserId)
        return res.status(400).json({ ok: false, error: 'Missing user email for sync. Please ensure your email is verified.' })
      }

      // Sync user from auth (new user, login_count = 1)
      const syncedUser = await syncUserFromAuth(authUserId, req, true)

      if (!syncedUser) {
        console.error('Failed to sync user')
        return res.status(500).json({ ok: false, error: 'Failed to sync user' })
      }

      // Track signup if this is a new user
      await trackSignup(authUserId, email, req.headers['referer']?.toString()).catch(() => {})
    } else {
      // Sync auth data for existing users (don't increment login count on profile update)
      await syncUserFromAuth(authUserId, req, false)
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

