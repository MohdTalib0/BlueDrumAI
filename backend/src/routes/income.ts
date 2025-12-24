import express from 'express'
import { requireAuth, getUserId } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'
import { logAuditEvent } from '../middleware/auditLogger'
import { z } from 'zod'
import { generateAffidavitPDF } from '../services/affidavitGenerator'

const router = express.Router()

// Validation schemas
const incomeLogSchema = z.object({
  month_year: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  gross_income: z.number().min(0),
  deductions: z
    .object({
      income_tax: z.number().min(0).optional(),
      pf: z.number().min(0).optional(),
      professional_tax: z.number().min(0).optional(),
      other: z.number().min(0).optional(),
    })
    .optional(),
  expenses: z
    .object({
      emi: z.number().min(0).optional(),
      medical: z.number().min(0).optional(),
      parents: z.number().min(0).optional(),
      rent: z.number().min(0).optional(),
      utilities: z.number().min(0).optional(),
      other: z.number().min(0).optional(),
    })
    .optional(),
  notes: z.string().optional(),
})

/**
 * Calculate disposable income based on Rajnesh v. Neha guidelines
 * Disposable Income = Gross Income - Statutory Deductions - Necessary Expenses
 */
function calculateDisposableIncome(grossIncome: number, deductions: any, expenses: any): number {
  const totalDeductions = Object.values(deductions || {}).reduce((sum: number, val: any) => sum + (val || 0), 0)
  const totalExpenses = Object.values(expenses || {}).reduce((sum: number, val: any) => sum + (val || 0), 0)
  return Math.max(0, grossIncome - totalDeductions - totalExpenses)
}

/**
 * POST /api/income/log
 * Log monthly income and expenses
 */
router.post('/log', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate request body
    const validationResult = incomeLogSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validationResult.error.errors })
    }

    const { month_year, gross_income, deductions = {}, expenses = {}, notes } = validationResult.data

    // Calculate disposable income
    const disposable_income = calculateDisposableIncome(gross_income, deductions, expenses)

    // Convert month_year (YYYY-MM) to date (first day of month)
    const monthDate = new Date(month_year + '-01')

    // Upsert income entry (update if exists, insert if new)
    const { data, error } = await supabaseAdmin
      .from('income_tracker')
      .upsert(
        {
          user_id: userId,
          month_year: monthDate.toISOString().split('T')[0], // Store as DATE
          gross_income,
          deductions,
          expenses,
          disposable_income,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,month_year',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving income data:', error)
      return res.status(500).json({ error: 'Failed to save income data', details: error.message })
    }

    // Log audit event
    await logAuditEvent(req, 'create', 'income_tracker', data.id, {
      after: {
        month_year,
        gross_income,
        disposable_income,
      },
    })

    res.json({
      success: true,
      entry: data,
    })
  } catch (err: any) {
    next(err)
  }
})

/**
 * GET /api/income/history
 * Get income history for the authenticated user
 */
router.get('/history', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log(`[Income History] Fetching for user_id: ${userId}`)

    const { data, error } = await supabaseAdmin
      .from('income_tracker')
      .select('*')
      .eq('user_id', userId)
      .order('month_year', { ascending: false })

    if (error) {
      console.error('[Income History] Supabase error:', error)
      
      // Check if it's a "relation does not exist" error (table doesn't exist)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.status(500).json({ 
          success: false,
          error: 'Income tracker table not found', 
          details: 'The income_tracker table does not exist in the database. Please run the database migrations.',
          code: error.code,
          hint: 'Run migration 001_initial_schema.sql in Supabase SQL Editor'
        })
      }
      
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch income history', 
        details: error.message,
        code: error.code 
      })
    }

    // Handle null or undefined data - return empty array
    const entries = data || []
    console.log(`[Income History] Found ${entries.length} entries for user ${userId}`)

    // Format month_year back to YYYY-MM format for frontend
    const formattedData = entries.map((entry) => ({
      ...entry,
      month_year: entry.month_year ? new Date(entry.month_year).toISOString().slice(0, 7) : null,
    }))

    res.json({
      success: true,
      entries: formattedData,
    })
  } catch (err: any) {
    console.error('[Income History] Unexpected error:', err)
    next(err)
  }
})

/**
 * GET /api/income/disposable
 * Calculate disposable income for a specific month
 */
router.get('/disposable', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { month_year } = req.query

    if (!month_year || typeof month_year !== 'string') {
      return res.status(400).json({ error: 'month_year query parameter is required (format: YYYY-MM)' })
    }

    const monthDate = new Date(month_year + '-01')

    const { data, error } = await supabaseAdmin
      .from('income_tracker')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthDate.toISOString().split('T')[0])
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No entry found
        return res.status(404).json({ error: 'No income data found for the specified month' })
      }
      console.error('Error fetching disposable income:', error)
      return res.status(500).json({ error: 'Failed to fetch disposable income', details: error.message })
    }

    res.json({
      success: true,
      disposable_income: data.disposable_income,
      entry: {
        ...data,
        month_year: data.month_year ? new Date(data.month_year).toISOString().slice(0, 7) : null,
      },
    })
  } catch (err: any) {
    next(err)
  }
})

/**
 * DELETE /api/income/entry/:id
 * Delete an income entry
 */
router.delete('/entry/:id', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    // First verify the entry belongs to the user
    const { data: existingEntry, error: fetchError } = await supabaseAdmin
      .from('income_tracker')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingEntry) {
      return res.status(404).json({ error: 'Income entry not found' })
    }

    // Delete the entry
    const { error } = await supabaseAdmin.from('income_tracker').delete().eq('id', id).eq('user_id', userId)

    if (error) {
      console.error('Error deleting income entry:', error)
      return res.status(500).json({ error: 'Failed to delete income entry', details: error.message })
    }

    // Log audit event
    await logAuditEvent(req, 'delete', 'income_tracker', id, {
      before: { entry_id: id },
    })

    res.json({
      success: true,
      message: 'Income entry deleted successfully',
    })
  } catch (err: any) {
    next(err)
  }
})

/**
 * POST /api/income/generate-affidavit
 * Generate PDF affidavit for income data
 */
router.post('/generate-affidavit', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { month_year } = req.body

    if (!month_year || typeof month_year !== 'string') {
      return res.status(400).json({ error: 'month_year is required (format: YYYY-MM)' })
    }

    const monthDate = new Date(month_year + '-01')

    // Fetch income entry
    const { data: entry, error } = await supabaseAdmin
      .from('income_tracker')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthDate.toISOString().split('T')[0])
      .single()

    if (error || !entry) {
      return res.status(404).json({ error: 'Income data not found for the specified month' })
    }

    // Fetch user data for affidavit
    const { data: userData, error: userError } = await supabaseAdmin.from('users').select('email').eq('id', userId).single()

    if (userError || !userData) {
      return res.status(404).json({ error: 'User data not found' })
    }

    // Generate PDF
    const pdfBuffer = await generateAffidavitPDF({
      userEmail: userData.email,
      monthYear: month_year,
      grossIncome: parseFloat(entry.gross_income.toString()),
      deductions: entry.deductions || {},
      expenses: entry.expenses || {},
      disposableIncome: parseFloat(entry.disposable_income.toString()),
      notes: entry.notes || '',
    })

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="income-affidavit-${month_year}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length.toString())

    // Log audit event
    await logAuditEvent(req, 'export', 'income_affidavit', undefined, {
      after: {
        month_year,
      },
    })

    res.send(pdfBuffer)
  } catch (err: any) {
    console.error('Error generating affidavit:', err)
    next(err)
  }
})

export default router

