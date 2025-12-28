import express from 'express'
import { requireAuth, getUserId } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'

const router = express.Router()

/**
 * GET /api/health/user
 * Check if authenticated user exists in Supabase
 * Useful for debugging Clerk + Supabase integration
 */
router.get('/user', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const authUserId = getUserId(req)

    if (!authUserId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    // Check if user exists in Supabase
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, gender, relationship_status, onboarding_completed, created_at')
      .eq('id', authUserId)
      .single()

    if (error || !user) {
      return res.json({
        ok: false,
        auth_user_id: authUserId,
        exists_in_supabase: false,
        message: 'User not found in Supabase. Call PATCH /api/auth/me to sync.',
      })
    }

    return res.json({
      ok: true,
      auth_user_id: authUserId,
      exists_in_supabase: true,
      user,
    })
  } catch (error: any) {
    console.error('Health check error:', error)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
})

export default router

