/**
 * Analytics service
 * Tracks user behavior and product metrics
 */

import { supabaseAdmin } from '../supabase'

export interface AnalyticsEvent {
  event_type: string
  user_id?: string
  properties?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

/**
 * Track analytics event
 * Stores events in user_activities table for analysis
 */
export async function trackEvent(event: AnalyticsEvent) {
  try {
    let supabaseUserId: string | null = null
    if (event.user_id) {
      supabaseUserId = event.user_id
    }

    await supabaseAdmin.from('user_activities').insert({
      user_id: supabaseUserId,
      activity_type: event.event_type,
      activity_details: event.properties || {},
      ip_address: event.ip_address || null,
      user_agent: event.user_agent || null,
      metadata: {
        tracked_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to track analytics event:', error)
  }
}

/**
 * Track user signup
 */
export async function trackSignup(userId: string, email: string, source?: string) {
  await trackEvent({
    event_type: 'user_signup',
    user_id: userId,
    properties: {
      email,
      source: source || 'unknown',
    },
  })
}

/**
 * Track user login
 */
export async function trackLogin(userId: string, ip?: string, userAgent?: string) {
  await trackEvent({
    event_type: 'user_login',
    user_id: userId,
    ip_address: ip,
    user_agent: userAgent,
  })
}

/**
 * Track feature usage
 */
export async function trackFeatureUsage(
  userId: string,
  feature: string,
  details?: Record<string, any>,
) {
  await trackEvent({
    event_type: 'feature_used',
    user_id: userId,
    properties: {
      feature,
      ...details,
    },
  })
}

