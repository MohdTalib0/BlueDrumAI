import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'
import { generateVaultPDF, generateChatAnalysisPDF, generateAffidavitPDF, type VaultEntry, type ChatAnalysisPDFData } from '../_shared/pdfGenerators.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts'
import { checkUsageLimit, incrementUsageSimple, limitReachedResponse } from '../_shared/subscription.ts'

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

    // Rate limit exports (3 per minute)
    const { allowed, retryAfter } = checkRateLimit(userId, 'export', 3, 60_000)
    if (!allowed) return rateLimitResponse(retryAfter!, corsHeaders)

    // Subscription limit for PDF exports
    const pdfLimit = await checkUsageLimit(userId, 'pdf_exports')
    if (!pdfLimit.allowed) return limitReachedResponse('pdf_exports', pdfLimit, corsHeaders)

    const url = new URL(req.url)
    const supabase = createSupabaseClient(req)

    // POST /vault - Export vault entries as PDF
    if (url.pathname.endsWith('/vault') && req.method === 'POST') {
      const { data: entries, error: entriesError } = await supabase
        .from('vault_entries')
        .select('id, user_id, type, module, file_url, file_hash, encrypted, metadata, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (entriesError) {
        return new Response(
          JSON.stringify({ ok: false, error: entriesError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!entries || entries.length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No vault entries found to export' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user email
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()

      // Generate PDF
      const pdfBytes = await generateVaultPDF({
        userId,
        userEmail: userData?.email || 'user@example.com',
        entries: entries as VaultEntry[],
        generatedAt: new Date().toISOString(),
      })

      await incrementUsageSimple(userId, 'pdf_exports').catch(() => {})

      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="vault-export-${Date.now()}.pdf"`,
        },
      })
    }

    // POST /affidavit - Export income affidavit
    if (url.pathname.endsWith('/affidavit') && req.method === 'POST') {
      const body = await req.json()
      const { month_year } = body

      if (!month_year) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Month and year are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: entry, error: entryError } = await supabase
        .from('income_tracker')
        .select('id, user_id, month_year, gross_income, deductions, expenses, disposable_income, notes, created_at')
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

      await incrementUsageSimple(userId, 'pdf_exports').catch(() => {})

      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="income-affidavit-${month_year}.pdf"`,
        },
      })
    }

    // POST /analysis - Export chat analysis as PDF
    if (url.pathname.endsWith('/analysis') && req.method === 'POST') {
      const body = await req.json()
      const { analysisId } = body

      if (!analysisId) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Analysis ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: analysis, error: analysisError } = await supabase
        .from('chat_analyses')
        .select('id, user_id, risk_score, red_flags, keywords_detected, analysis_text, platform, patterns_detected, recommendations, created_at, summary, participants, total_messages, date_range')
        .eq('id', analysisId)
        .eq('user_id', userId)
        .single()

      if (analysisError || !analysis) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Analysis not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user email
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()

      // Generate PDF
      const pdfData: ChatAnalysisPDFData = {
        userEmail: userData?.email || 'Unknown',
        analysis: {
          riskScore: analysis.risk_score || 0,
          summary: analysis.summary || '',
          redFlags: (analysis.red_flags as any[]) || [],
          recommendations: (analysis.recommendations as string[]) || [],
          patternsDetected: (analysis.patterns_detected as any[]) || [],
          keywordsDetected: (analysis.keywords_detected as string[]) || [],
          createdAt: analysis.created_at,
          chatStats: analysis.participants
            ? {
                totalMessages: analysis.total_messages || 0,
                participants: analysis.participants as string[],
                dateRange: (analysis.date_range as any) || { start: '', end: '' },
              }
            : undefined,
        },
      }

      const pdfBytes = await generateChatAnalysisPDF(pdfData)

      await incrementUsageSimple(userId, 'pdf_exports').catch(() => {})

      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="chat-analysis-${analysisId}.pdf"`,
        },
      })
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Export function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

