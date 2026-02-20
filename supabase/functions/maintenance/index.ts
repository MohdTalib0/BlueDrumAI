import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts'

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

    const url = new URL(req.url)
    const supabase = createSupabaseClient(req)

    // ── CALCULATE ──

    // POST /calculate - Calculate maintenance amount
    if (url.pathname.endsWith('/calculate') && req.method === 'POST') {
      const rl = checkRateLimit(userId, 'maintenance:calculate', 30, 60_000)
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, corsHeaders)

      let body
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const {
        husband_gross_income,
        husband_deductions,
        wife_income,
        num_children,
        children_ages,
        legal_basis,
        notes,
      } = body

      if (husband_gross_income == null || typeof husband_gross_income !== 'number' || husband_gross_income < 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'husband_gross_income must be a non-negative number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const parsedChildren = typeof num_children === 'number' && num_children >= 0 ? Math.min(Math.floor(num_children), 20) : 0
      const parsedWifeIncome = typeof wife_income === 'number' && wife_income >= 0 ? wife_income : 0

      const deductions = husband_deductions && typeof husband_deductions === 'object' ? husband_deductions : {}
      const totalDeductions = Object.values(deductions).reduce(
        (sum: number, val: unknown) => sum + (typeof val === 'number' && val >= 0 ? val : 0),
        0
      )
      const husbandNetIncome = Math.max(husband_gross_income - totalDeductions, 0)

      // Indian court guidelines (Rajnesh v. Neha, 2020):
      // - Wife: ~25% of husband's net income (adjusted if wife has own income)
      // - Per child: ~5-7.5% per child, more for younger children
      // - Total cap: ~50% of husband's net income
      const wifePercentage = parsedWifeIncome > 0 ? 0.20 : 0.25
      let maintenanceForWife = Math.round(husbandNetIncome * wifePercentage)

      if (parsedWifeIncome > 0) {
        maintenanceForWife = Math.max(maintenanceForWife - Math.round(parsedWifeIncome * 0.5), 0)
      }

      const ages = Array.isArray(children_ages) ? children_ages : []
      let maintenancePerChild = 0
      if (parsedChildren > 0) {
        const avgAge = ages.length > 0
          ? ages.reduce((s: number, a: unknown) => s + (typeof a === 'number' ? a : 10), 0) / ages.length
          : 10
        const childPercentage = avgAge < 6 ? 0.075 : avgAge < 12 ? 0.065 : 0.05
        maintenancePerChild = Math.round(husbandNetIncome * childPercentage)
      }

      const totalBeforeCap = maintenanceForWife + (maintenancePerChild * parsedChildren)
      const cap = Math.round(husbandNetIncome * 0.50)
      const totalMaintenance = Math.min(totalBeforeCap, cap)

      if (totalBeforeCap > cap) {
        const ratio = cap / totalBeforeCap
        maintenanceForWife = Math.round(maintenanceForWife * ratio)
        maintenancePerChild = Math.round(maintenancePerChild * ratio)
      }

      const percentageApplied = husbandNetIncome > 0
        ? parseFloat(((totalMaintenance / husbandNetIncome) * 100).toFixed(1))
        : 0

      const validBases = ['section_125_crpc', 'hindu_marriage_act', 'dv_act_2005', 'other']
      const safeLegalBasis = legal_basis && validBases.includes(legal_basis) ? legal_basis : 'section_125_crpc'

      const { data, error } = await supabase
        .from('maintenance_calculations')
        .insert({
          user_id: userId,
          husband_gross_income,
          husband_deductions: deductions,
          husband_net_income: husbandNetIncome,
          wife_income: parsedWifeIncome,
          num_children: parsedChildren,
          children_ages: ages.filter((a: unknown) => typeof a === 'number'),
          maintenance_for_wife: maintenanceForWife,
          maintenance_per_child: maintenancePerChild,
          total_maintenance: totalMaintenance,
          percentage_applied: percentageApplied,
          legal_basis: safeLegalBasis,
          notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) : null,
        })
        .select('id, husband_net_income, maintenance_for_wife, maintenance_per_child, total_maintenance, percentage_applied, created_at')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, calculation: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /calculations - List saved calculations
    if (url.pathname.endsWith('/calculations') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('maintenance_calculations')
        .select('id, husband_gross_income, husband_net_income, wife_income, num_children, maintenance_for_wife, maintenance_per_child, total_maintenance, percentage_applied, legal_basis, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, calculations: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /calculation/:id
    if (url.pathname.includes('/calculation/') && req.method === 'GET') {
      const calcId = url.pathname.split('/calculation/')[1]
      const { data, error } = await supabase
        .from('maintenance_calculations')
        .select('*')
        .eq('id', calcId)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Calculation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, calculation: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /calculation/:id
    if (url.pathname.includes('/calculation/') && req.method === 'DELETE') {
      const calcId = url.pathname.split('/calculation/')[1]
      const { error } = await supabase
        .from('maintenance_calculations')
        .delete()
        .eq('id', calcId)
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

    // ── EXPENSES ──

    // GET /expenses
    if (url.pathname.endsWith('/expenses') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('maintenance_expenses')
        .select('id, category, description, amount, frequency, beneficiary, expense_date, receipt_url, notes, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, expenses: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /expense
    if (url.pathname.endsWith('/expense') && req.method === 'POST') {
      const rl = checkRateLimit(userId, 'maintenance:expense', 30, 60_000)
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, corsHeaders)

      let body
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { category, description, amount, frequency, beneficiary, expense_date, receipt_url, notes } = body

      const validCategories = ['education', 'medical', 'housing', 'food', 'clothing', 'transport', 'childcare', 'utilities', 'legal', 'other']
      if (!category || !validCategories.includes(category)) {
        return new Response(
          JSON.stringify({ ok: false, error: `category must be one of: ${validCategories.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'description is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'amount must be a positive number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validFrequencies = ['one_time', 'monthly', 'quarterly', 'yearly']
      const safeFrequency = frequency && validFrequencies.includes(frequency) ? frequency : 'monthly'

      const validBeneficiaries = ['self', 'child', 'household']
      const safeBeneficiary = beneficiary && validBeneficiaries.includes(beneficiary) ? beneficiary : null

      const { data, error } = await supabase
        .from('maintenance_expenses')
        .insert({
          user_id: userId,
          category,
          description: description.trim().slice(0, 500),
          amount: parsedAmount,
          frequency: safeFrequency,
          beneficiary: safeBeneficiary,
          expense_date: expense_date || null,
          receipt_url: typeof receipt_url === 'string' ? receipt_url.trim() : null,
          notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) : null,
        })
        .select('id, created_at')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, expense: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /expense/:id
    if (url.pathname.includes('/expense/') && req.method === 'PATCH') {
      const rl = checkRateLimit(userId, 'maintenance:expense', 30, 60_000)
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, corsHeaders)

      const expenseId = url.pathname.split('/expense/')[1]
      let body
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const allowedFields = ['category', 'description', 'amount', 'frequency', 'beneficiary', 'expense_date', 'receipt_url', 'notes']
      const sanitized: Record<string, unknown> = {}
      for (const key of allowedFields) {
        if (key in body) sanitized[key] = body[key]
      }

      if (sanitized.category != null) {
        const validCategories = ['education', 'medical', 'housing', 'food', 'clothing', 'transport', 'childcare', 'utilities', 'legal', 'other']
        if (!validCategories.includes(String(sanitized.category))) {
          return new Response(
            JSON.stringify({ ok: false, error: `category must be one of: ${validCategories.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      if (sanitized.amount != null) {
        const v = typeof sanitized.amount === 'number' ? sanitized.amount : parseFloat(String(sanitized.amount))
        if (isNaN(v) || v <= 0) {
          return new Response(
            JSON.stringify({ ok: false, error: 'amount must be a positive number' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        sanitized.amount = v
      }

      if (sanitized.frequency != null) {
        const validFreqs = ['one_time', 'monthly', 'quarterly', 'yearly']
        if (!validFreqs.includes(String(sanitized.frequency))) {
          return new Response(
            JSON.stringify({ ok: false, error: `frequency must be one of: ${validFreqs.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      if (sanitized.beneficiary != null) {
        const validBens = ['self', 'child', 'household']
        if (sanitized.beneficiary !== '' && !validBens.includes(String(sanitized.beneficiary))) {
          return new Response(
            JSON.stringify({ ok: false, error: `beneficiary must be one of: ${validBens.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      if (sanitized.description != null) {
        if (typeof sanitized.description !== 'string' || String(sanitized.description).trim().length === 0) {
          return new Response(
            JSON.stringify({ ok: false, error: 'description must be a non-empty string' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        sanitized.description = String(sanitized.description).trim().slice(0, 500)
      }

      if (sanitized.notes != null) {
        sanitized.notes = typeof sanitized.notes === 'string' ? sanitized.notes.trim().slice(0, 2000) : null
      }

      if (sanitized.receipt_url != null) {
        sanitized.receipt_url = typeof sanitized.receipt_url === 'string' ? sanitized.receipt_url.trim() : null
      }

      if (Object.keys(sanitized).length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No valid fields to update' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('maintenance_expenses')
        .update(sanitized)
        .eq('id', expenseId)
        .eq('user_id', userId)
        .select('id, created_at')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, expense: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /expense/:id
    if (url.pathname.includes('/expense/') && req.method === 'DELETE') {
      const expenseId = url.pathname.split('/expense/')[1]

      const { error } = await supabase
        .from('maintenance_expenses')
        .delete()
        .eq('id', expenseId)
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

    // ── RIGHTS INFO ──

    // GET /rights - Maintenance rights information
    if (url.pathname.endsWith('/rights') && req.method === 'GET') {
      const rightsInfo = {
        sections: [
          {
            title: 'Section 125 CrPC - Maintenance of Wives, Children & Parents',
            key: 'section_125_crpc',
            description: 'Any person with sufficient means who neglects or refuses to maintain their wife, children, or parents can be ordered to pay a monthly maintenance allowance.',
            eligibility: [
              'Wife who is unable to maintain herself',
              'Legitimate or illegitimate minor children',
              'Legitimate or illegitimate children who are physically or mentally abnormal (even if major)',
              'Father or mother unable to maintain themselves',
            ],
            keyPoints: [
              'Available to all women regardless of religion',
              'Quick remedy — proceedings are summary in nature',
              'Maximum amount: No statutory cap (court discretion)',
              'Can be filed in the Magistrate court where the wife resides',
              'Interim maintenance can be granted pending final decision',
            ],
          },
          {
            title: 'Hindu Marriage Act, 1955 - Section 24 & 25',
            key: 'hindu_marriage_act',
            description: 'Provides for maintenance pendente lite (during proceedings) and permanent alimony and maintenance after divorce.',
            eligibility: [
              'Either spouse with no independent income sufficient for support',
              'Available during pendency of matrimonial proceedings (Section 24)',
              'Available as permanent alimony after decree (Section 25)',
            ],
            keyPoints: [
              'Applicable to Hindu, Jain, Sikh, and Buddhist marriages',
              'Court considers earning capacity of both parties',
              'Maintenance can be modified if circumstances change',
              'Lump-sum or periodic payments at court discretion',
            ],
          },
          {
            title: 'Protection of Women from Domestic Violence Act, 2005',
            key: 'dv_act_2005',
            description: 'Provides monetary relief including maintenance to meet expenses and losses suffered by the aggrieved person.',
            eligibility: [
              'Any woman in a domestic relationship',
              'Covers wife, live-in partner, sister, mother, or any woman in shared household',
            ],
            keyPoints: [
              'Covers medical expenses, loss of earnings, and maintenance',
              'Can be claimed alongside other reliefs (protection orders, residence orders)',
              'Filed before Magistrate in jurisdiction where aggrieved person resides',
              'Can grant interim orders on first hearing itself',
            ],
          },
        ],
        courtFilingTips: [
          'Collect all financial documents: salary slips, bank statements, IT returns',
          'Document all expenses with receipts and bills',
          'Maintain a detailed record of standard of living during marriage',
          'Keep evidence of husband\'s assets: property, vehicles, investments',
          'Record any evidence of hidden income or undisclosed assets',
          'Consult with a family law lawyer in your jurisdiction',
        ],
        referenceCases: [
          { name: 'Rajnesh v. Neha (2020)', summary: 'Supreme Court laid down guidelines for maintenance computation — overlapping jurisdictions, affidavit of disclosure requirements' },
          { name: 'Bhuwan Mohan Singh v. Meena (2015)', summary: 'Maintenance cannot be denied or reduced unreasonably; wife entitled to live at same standard as during marriage' },
          { name: 'Chaturbhuj v. Sita Bai (2008)', summary: 'Wife not entitled to maintenance under Section 125 if living in adultery or refuses to live with husband without sufficient reason' },
        ],
      }

      return new Response(
        JSON.stringify({ ok: true, rights: rightsInfo }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── SUMMARY ──

    // GET /summary
    if (url.pathname.endsWith('/summary') && req.method === 'GET') {
      const [calcsResult, expensesResult] = await Promise.all([
        supabase
          .from('maintenance_calculations')
          .select('id, total_maintenance, percentage_applied, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('maintenance_expenses')
          .select('id, category, amount, frequency')
          .eq('user_id', userId),
      ])

      if (calcsResult.error || expensesResult.error) {
        return new Response(
          JSON.stringify({ ok: false, error: (calcsResult.error || expensesResult.error)!.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const calculations = calcsResult.data || []
      const expenses = expensesResult.data || []

      const freqMultiplier: Record<string, number> = { one_time: 0, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }
      const totalMonthlyExpenses = expenses.reduce((sum, e) => {
        const mult = freqMultiplier[e.frequency] ?? 1
        return sum + parseFloat(String(e.amount || 0)) * mult
      }, 0)

      const byCategory: Record<string, { count: number; monthlyTotal: number }> = {}
      for (const e of expenses) {
        const cat = e.category || 'other'
        if (!byCategory[cat]) byCategory[cat] = { count: 0, monthlyTotal: 0 }
        byCategory[cat].count++
        const mult = freqMultiplier[e.frequency] ?? 1
        byCategory[cat].monthlyTotal += parseFloat(String(e.amount || 0)) * mult
      }

      const latestCalc = calculations[0] || null

      return new Response(
        JSON.stringify({
          ok: true,
          summary: {
            totalCalculations: calculations.length,
            totalExpenses: expenses.length,
            totalMonthlyExpenses: Math.round(totalMonthlyExpenses),
            latestMaintenance: latestCalc ? parseFloat(String(latestCalc.total_maintenance)) : 0,
            byCategory,
            latestCalculation: latestCalc,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Maintenance function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
