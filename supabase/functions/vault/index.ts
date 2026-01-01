import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

serve(async (req) => {
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
        .select('*')
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
      const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {}

      if (!file) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      const filePath = `vault-files/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vault-files')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        return new Response(
          JSON.stringify({ ok: false, error: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('vault-files').getPublicUrl(filePath)

      // Save entry to database
      const { data: entryData, error: dbError } = await supabase
        .from('vault_entries')
        .insert({
          user_id: userId,
          type: type || 'document',
          module: module || 'consent_vault',
          file_url: urlData.publicUrl,
          file_path: filePath,
          metadata: metadata,
        })
        .select()
        .single()

      if (dbError) {
        return new Response(
          JSON.stringify({ ok: false, error: dbError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, entry: entryData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /entry/:id - Delete entry
    if (url.pathname.includes('/entry/') && req.method === 'DELETE') {
      const entryId = url.pathname.split('/entry/')[1]

      // Get entry first to get file path
      const { data: entry } = await supabase
        .from('vault_entries')
        .select('file_path')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single()

      // Delete from storage if exists
      if (entry?.file_path) {
        await supabase.storage.from('vault-files').remove([entry.file_path])
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

