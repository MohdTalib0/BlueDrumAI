import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname

  try {
    if (path.includes('/db')) {
      // Database health check
      const supabase = createSupabaseClient(req)
      const { error } = await supabase.from('waitlist').select('id').limit(1)

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, db: false }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, db: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic health check
    return new Response(
      JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Health check error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Health check failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

