import express from 'express'
import { requireAuth, getUserId } from '../middleware/auth'
import { generateVaultPDF, getVaultEntriesForPDF } from '../services/vaultPDFGenerator'
import { generateIncomeAffidavit } from '../services/affidavitGenerator'
import { generateChatAnalysisPDF } from '../services/chatAnalysisPDF'
import { supabaseAdmin } from '../supabase'
import { logAuditEvent } from '../middleware/auditLogger'

const router = express.Router()

/**
 * POST /api/export/vault
 * Export all vault entries as PDF
 */
router.post('/vault', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user email
    const { data: userData, error: userError } = await supabaseAdmin.from('users').select('email').eq('id', userId).single()

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Fetch vault entries
    const entries = await getVaultEntriesForPDF(userId)

    if (entries.length === 0) {
      return res.status(400).json({ error: 'No vault entries found to export' })
    }

    // Generate PDF
    const pdfBuffer = await generateVaultPDF({
      userId,
      userEmail: userData.email,
      entries,
      generatedAt: new Date().toISOString(),
    })

    // Log audit event
    await logAuditEvent(req, 'export', 'vault_entries', undefined, {
      after: {
        entry_count: entries.length,
        export_type: 'pdf',
      },
    })

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="vault-export-${Date.now()}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length.toString())

    res.send(pdfBuffer)
  } catch (err: any) {
    console.error('[Export] Error generating vault PDF:', err)
    next(err)
  }
})

/**
 * POST /api/export/affidavit
 * Export income affidavit as PDF (already implemented in income routes, but adding here for consistency)
 */
router.post('/affidavit', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { month_year } = req.body

    if (!month_year) {
      return res.status(400).json({ error: 'Month and year are required' })
    }

    // Fetch income entry
    const { data: entry, error } = await supabaseAdmin
      .from('income_tracker')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', month_year)
      .single()

    if (error || !entry) {
      return res.status(404).json({ error: 'Income entry not found for the specified month' })
    }

    // Get user details
    const { data: userData } = await supabaseAdmin.from('users').select('email, first_name, last_name').eq('id', userId).single()

    // Generate PDF
    const pdfBuffer = await generateIncomeAffidavit({
      monthYear: entry.month_year,
      grossIncome: parseFloat(entry.gross_income),
      deductions: entry.deductions || {},
      expenses: entry.expenses || {},
      disposableIncome: parseFloat(entry.disposable_income),
      fullName: userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() : 'User',
      notes: entry.notes || '',
    })

    // Log audit event
    await logAuditEvent(req, 'export', 'income_affidavit', entry.id, {
      after: {
        month_year: entry.month_year,
        export_type: 'pdf',
      },
    })

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="income-affidavit-${month_year}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length.toString())

    res.send(pdfBuffer)
  } catch (err: any) {
    console.error('[Export] Error generating affidavit PDF:', err)
    next(err)
  }
})

/**
 * POST /api/export/analysis
 * Export chat analysis report as PDF
 */
router.post('/analysis/:id', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    // Fetch analysis
    const { data: analysis, error } = await supabaseAdmin
      .from('chat_analyses')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .single()

    if (error || !analysis) {
      return res.status(404).json({ error: 'Analysis not found' })
    }

    // Get user email
    const { data: userData } = await supabaseAdmin.from('users').select('email').eq('id', userId).single()

    // Generate PDF
    const pdfBuffer = await generateChatAnalysisPDF({
      userEmail: userData?.email || 'Unknown',
      analysis: {
        riskScore: analysis.risk_score,
        summary: analysis.analysis_text || '',
        redFlags: (analysis.red_flags as any[]) || [],
        recommendations: (analysis.recommendations as string[]) || [],
        patternsDetected: (analysis.patterns_detected as any[]) || [],
        keywordsDetected: (analysis.keywords_detected as string[]) || [],
        createdAt: analysis.created_at,
      },
    })

    // Log audit event
    await logAuditEvent(req, 'export', 'chat_analysis', id, {
      after: {
        analysis_id: id,
        export_type: 'pdf',
      },
    })

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="chat-analysis-${id}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length.toString())

    res.send(pdfBuffer)
  } catch (err: any) {
    console.error('[Export] Error generating analysis PDF:', err)
    next(err)
  }
})

export default router

