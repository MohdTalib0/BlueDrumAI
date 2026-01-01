import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'
import { generateAffidavitPDF } from '../_shared/pdfGenerators.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

    // POST /log - Log income entry
    if (url.pathname.endsWith('/log') && req.method === 'POST') {
      const body = await req.json()
      const { month_year, gross_income, deductions, expenses } = body

      const { data, error } = await supabase
        .from('income_tracker')
        .insert({
          user_id: userId,
          month_year,
          gross_income,
          deductions: deductions || {},
          expenses: expenses || {},
        })
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, entry: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /history - Get income history
    if (url.pathname.endsWith('/history') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('income_tracker')
        .select('*')
        .eq('user_id', userId)
        .order('month_year', { ascending: false })

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

    // PATCH /entry/:id - Update income entry
    if (url.pathname.includes('/entry/') && req.method === 'PATCH') {
      const entryId = url.pathname.split('/entry/')[1]
      const body = await req.json()

      const { data, error } = await supabase
        .from('income_tracker')
        .update(body)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, entry: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /entry/:id - Delete income entry
    if (url.pathname.includes('/entry/') && req.method === 'DELETE') {
      const entryId = url.pathname.split('/entry/')[1]

      const { error } = await supabase
        .from('income_tracker')
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

    // GET /disposable - Calculate disposable income for a month
    if (url.pathname.endsWith('/disposable') && req.method === 'GET') {
      const monthYear = url.searchParams.get('month')
      if (!monthYear) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Month parameter required (YYYY-MM)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: entry } = await supabase
        .from('income_tracker')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', monthYear)
        .single()

      if (!entry) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Entry not found for this month' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate disposable income
      const gross = parseFloat(entry.gross_income || 0)
      const deductions = entry.deductions || {}
      const expenses = entry.expenses || {}
      
      const totalDeductions = Object.values(deductions).reduce((sum: number, v: any) => sum + parseFloat(v || 0), 0)
      const totalExpenses = Object.values(expenses).reduce((sum: number, v: any) => sum + parseFloat(v || 0), 0)
      
      const disposableIncome = gross - totalDeductions - totalExpenses

      return new Response(
        JSON.stringify({
          ok: true,
          disposableIncome: Math.max(0, disposableIncome),
          grossIncome: gross,
          totalDeductions,
          totalExpenses,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /generate-affidavit - Generate PDF affidavit
    if (url.pathname.endsWith('/generate-affidavit') && req.method === 'POST') {
      const body = await req.json()
      const { month_year } = body

      if (!month_year) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Month and year are required (YYYY-MM)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: entry, error: entryError } = await supabase
        .from('income_tracker')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', month_year)
        .single()

      if (entryError || !entry) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Income entry not found for the specified month' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user details
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()

      // Calculate disposable income
      const gross = parseFloat(entry.gross_income || 0)
      const deductions = entry.deductions || {}
      const expenses = entry.expenses || {}
      const totalDeductions = Object.values(deductions).reduce((sum: number, v: any) => sum + parseFloat(v || 0), 0)
      const totalExpenses = Object.values(expenses).reduce((sum: number, v: any) => sum + parseFloat(v || 0), 0)
      const disposableIncome = gross - totalDeductions - totalExpenses

      // Generate PDF
      const pdfBytes = await generateAffidavitPDF({
        userEmail: userData?.email || 'user@example.com',
        monthYear: entry.month_year,
        grossIncome: gross,
        deductions: deductions as any,
        expenses: expenses as any,
        disposableIncome: Math.max(0, disposableIncome),
        notes: entry.notes || undefined,
      })

      // Return PDF
      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="income-affidavit-${month_year}.pdf"`,
        },
      })
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Income function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

