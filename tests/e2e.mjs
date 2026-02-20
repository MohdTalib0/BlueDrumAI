/**
 * Blue Drum AI — End-to-End API Test Suite
 *
 * Tests every deployed Edge Function endpoint against the live Supabase project.
 *
 * Setup:
 *   1. Copy .env to the project root (already there).
 *   2. Fill in TEST_EMAIL and TEST_PASSWORD below with a real test account.
 *   3. Run:  node tests/e2e.mjs
 *   4. Optionally run AI tests: RUN_AI_TESTS=true node tests/e2e.mjs
 *
 * The script creates & cleans up its own data. Nothing is left behind.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─────────────────────────────────────────────
// CONFIG — fill in your test account credentials
// ─────────────────────────────────────────────
const TEST_EMAIL    = process.env.TEST_EMAIL    || 'YOUR_TEST_EMAIL@example.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'YOUR_TEST_PASSWORD'
const RUN_AI_TESTS  = process.env.RUN_AI_TESTS  === 'true'   // costs real AI credits

// ─────────────────────────────────────────────
// LOAD .env
// ─────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath   = resolve(__dirname, '../.env')

function loadEnv(path) {
  try {
    const raw = readFileSync(path, 'utf8')
    const vars = {}
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
    return vars
  } catch {
    return {}
  }
}

const env = loadEnv(envPath)
const SUPABASE_URL  = env.VITE_SUPABASE_URL  || process.env.VITE_SUPABASE_URL
const ANON_KEY      = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const API_BASE      = env.VITE_API_BASE_URL  || process.env.VITE_API_BASE_URL

if (!SUPABASE_URL || !ANON_KEY || !API_BASE) {
  console.error('❌  Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_API_BASE_URL in .env')
  process.exit(1)
}

// ─────────────────────────────────────────────
// SIMPLE TEST RUNNER
// ─────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0
const failures = []

function pass(name) {
  console.log(`  ✅  ${name}`)
  passed++
}

function fail(name, reason) {
  console.log(`  ❌  ${name}`)
  console.log(`       → ${reason}`)
  failed++
  failures.push({ name, reason })
}

function skip(name, reason) {
  console.log(`  ⏭   ${name}  (${reason})`)
  skipped++
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`)
}

function assert(name, condition, detail = '') {
  condition ? pass(name) : fail(name, detail || 'assertion failed')
}

// ─────────────────────────────────────────────
// HTTP HELPERS
// ─────────────────────────────────────────────
async function api(method, path, { body, token, contentType } = {}) {
  const url = `${API_BASE}${path}`
  const headers = {
    'apikey': ANON_KEY,
    'Content-Type': contentType || 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const opts = { method, headers }
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body)

  const res = await fetch(url, opts)
  let json = null
  try { json = await res.json() } catch { /* non-JSON response */ }
  return { status: res.status, body: json }
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
async function signIn(email, password) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  )
  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`Sign-in failed: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function run() {
  console.log('🧪  Blue Drum AI — E2E Test Suite')
  console.log(`    API:  ${API_BASE}`)
  console.log(`    User: ${TEST_EMAIL}`)
  console.log(`    AI tests: ${RUN_AI_TESTS ? 'ENABLED (costs credits)' : 'skipped (set RUN_AI_TESTS=true to enable)'}`)

  // ── Sign in ─────────────────────────────────
  section('Authentication')
  let token
  try {
    token = await signIn(TEST_EMAIL, TEST_PASSWORD)
    pass('Sign in with test user')
  } catch (e) {
    fail('Sign in with test user', e.message)
    console.error('\n⛔  Cannot continue without auth. Fix credentials and retry.')
    process.exit(1)
  }

  // ─────────────────────────────────────────────
  // 1. HEALTH
  // ─────────────────────────────────────────────
  section('Health')

  // Health endpoints are public but Supabase gateway still requires the anon key in Authorization
  let r = await api('GET', '/health', { token: ANON_KEY })
  assert('GET /health → 200 ok', r.status === 200 && r.body?.ok === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  r = await api('GET', '/health/db', { token: ANON_KEY })
  assert('GET /health/db → 200 db=true', r.status === 200 && r.body?.db === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  // ─────────────────────────────────────────────
  // 2. AUTH GUARD — unauthenticated requests must return 401
  // ─────────────────────────────────────────────
  section('Auth Guards (no token → 401)')

  for (const path of ['/analyze/history', '/dowry/entries', '/dv/incidents',
                       '/maintenance/calculations', '/breakup/messages',
                       '/dashboard/stats', '/vault/entries', '/income/history']) {
    r = await api('GET', path)
    assert(`GET ${path} → 401`, r.status === 401,
      `Expected 401, got ${r.status}`)
  }

  // ─────────────────────────────────────────────
  // 3. DASHBOARD
  // ─────────────────────────────────────────────
  section('Dashboard')

  r = await api('GET', '/dashboard/stats', { token })
  assert('GET /dashboard/stats → 200', r.status === 200 && r.body?.ok === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)
  assert('GET /dashboard/stats has stats.vault.total', typeof r.body?.stats?.vault?.total === 'number',
    `stats.vault.total missing from: ${JSON.stringify(r.body?.stats)}`)

  // ─────────────────────────────────────────────
  // 4. VAULT
  // ─────────────────────────────────────────────
  section('Vault')

  r = await api('GET', '/vault/entries', { token })
  assert('GET /vault/entries → 200', r.status === 200 && Array.isArray(r.body?.entries),
    `status=${r.status}`)

  // ─────────────────────────────────────────────
  // 5. ANALYZE
  // ─────────────────────────────────────────────
  section('Analyze — Red Flag Radar')

  r = await api('GET', '/analyze/history', { token })
  assert('GET /analyze/history → 200', r.status === 200 && Array.isArray(r.body?.analyses),
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  r = await api('GET', '/analyze/trends', { token })
  assert('GET /analyze/trends → 200', r.status === 200 && r.body?.ok === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  // Validation — missing text
  r = await api('POST', '/analyze/text', { token, body: {} })
  assert('POST /analyze/text (no text) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  if (RUN_AI_TESTS) {
    // The /text endpoint requires chat-formatted text, not plain text
    const chatText = [
      'Rahul: Give me all your savings or I will tell everyone what you did.',
      'Priya: Please stop threatening me.',
      'Rahul: You better transfer the money by tonight or else.',
      'Priya: I am scared. Please leave me alone.',
      'Rahul: I will make your life hell if you dont comply.',
    ].join('\n')

    r = await api('POST', '/analyze/text', {
      token,
      body: { text: chatText, platform: 'whatsapp' },
    })
    assert('POST /analyze/text (AI) → 200', r.status === 200 && r.body?.ok === true,
      `status=${r.status} body=${JSON.stringify(r.body)}`)
    assert('POST /analyze/text returns riskScore', typeof r.body?.analysis?.risk_score === 'number',
      JSON.stringify(r.body?.analysis))
  } else {
    skip('POST /analyze/text (AI call)', 'RUN_AI_TESTS not set')
  }

  // Red flag chat validation
  r = await api('POST', '/analyze/red-flag-chat', { token, body: {} })
  assert('POST /analyze/red-flag-chat (no body) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  // ─────────────────────────────────────────────
  // 6. RISK CHECK (unauthenticated endpoint)
  // ─────────────────────────────────────────────
  section('Risk Check (pre-login, public endpoint)')

  r = await api('POST', '/risk-check', {
    body: { email: 'invalid', gender: 'male', answers: {} },
  })
  assert('POST /risk-check (bad email) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  r = await api('POST', '/risk-check', {
    body: { email: TEST_EMAIL, gender: 'unknown', answers: {} },
  })
  assert('POST /risk-check (bad gender) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  if (RUN_AI_TESTS) {
    r = await api('POST', '/risk-check', {
      body: {
        email: `e2e-test-${Date.now()}@test.com`,
        gender: 'male',
        answers: { q1: 'yes', q2: 'no' },
        manualInput: 'Feeling pressured financially',
      },
    })
    // 200 = success; 500 = AI key not configured yet (acceptable during setup)
    const riskOk = r.status === 200 && r.body?.ok === true
    const riskKeyMissing = r.status === 500 && r.body?.error?.includes('AI providers failed')
    assert('POST /risk-check (AI) → 200 (or 500 if OPENROUTER_API_KEY not set)',
      riskOk || riskKeyMissing,
      `status=${r.status} body=${JSON.stringify(r.body)}`)
    if (riskKeyMissing) console.log('       ⚠️   OPENROUTER_API_KEY not configured in Supabase secrets yet')
  } else {
    skip('POST /risk-check (AI call)', 'RUN_AI_TESTS not set')
  }

  // ─────────────────────────────────────────────
  // 7. DOWRY VAULT
  // ─────────────────────────────────────────────
  section('Dowry Vault')

  r = await api('GET', '/dowry/entries', { token })
  assert('GET /dowry/entries → 200', r.status === 200 && Array.isArray(r.body?.entries),
    `status=${r.status}`)

  r = await api('GET', '/dowry/summary', { token })
  assert('GET /dowry/summary → 200', r.status === 200 && r.body?.ok === true,
    `status=${r.status}`)

  r = await api('GET', '/dowry/witnesses', { token })
  assert('GET /dowry/witnesses → 200', r.status === 200 && Array.isArray(r.body?.witnesses),
    `status=${r.status}`)

  // Validation — missing required fields
  r = await api('POST', '/dowry/entry', { token, body: { value: 100 } })
  assert('POST /dowry/entry (missing fields) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  // Backend validates required fields and value range, but not description length
  r = await api('POST', '/dowry/entry', { token, body: { item_description: 'Gold ring', value: -500, transfer_type: 'cash' } })
  assert('POST /dowry/entry (negative value) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  // Create → verify → delete
  r = await api('POST', '/dowry/entry', {
    token,
    body: { item_description: 'E2E Test Item', value: 5000, transfer_type: 'cash', gift_date: '2024-01-01' },
  })
  assert('POST /dowry/entry (valid) → 201', r.status === 201 && r.body?.ok === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  const dowryEntryId = r.body?.entry?.id
  if (dowryEntryId) {
    // PATCH
    r = await api('PATCH', `/dowry/entry/${dowryEntryId}`, { token, body: { value: 6000 } })
    assert('PATCH /dowry/entry/:id → 200', r.status === 200 && r.body?.ok === true,
      `status=${r.status}`)

    // DELETE
    r = await api('DELETE', `/dowry/entry/${dowryEntryId}`, { token })
    assert('DELETE /dowry/entry/:id → 200', r.status === 200 && r.body?.ok === true,
      `status=${r.status}`)
  } else {
    fail('POST /dowry/entry — no id returned, cannot test PATCH/DELETE', JSON.stringify(r.body))
  }

  // Witness CRUD
  r = await api('POST', '/dowry/witness', { token, body: {} })
  assert('POST /dowry/witness (missing name) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  r = await api('POST', '/dowry/witness', {
    token,
    body: { name: 'E2E Witness', relationship: 'friend', phone: '9999999999' },
  })
  assert('POST /dowry/witness (valid) → 201', r.status === 201 && r.body?.ok === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  const witnessId = r.body?.witness?.id
  if (witnessId) {
    r = await api('DELETE', `/dowry/witness/${witnessId}`, { token })
    assert('DELETE /dowry/witness/:id → 200', r.status === 200 && r.body?.ok === true,
      `status=${r.status}`)
  }

  // ─────────────────────────────────────────────
  // 8. DV LOG
  // ─────────────────────────────────────────────
  section('Domestic Violence Log')

  r = await api('GET', '/dv/incidents', { token })
  assert('GET /dv/incidents → 200', r.status === 200 && Array.isArray(r.body?.incidents),
    `status=${r.status}`)

  r = await api('GET', '/dv/medical-reports', { token })
  assert('GET /dv/medical-reports → 200', r.status === 200 && Array.isArray(r.body?.reports),
    `status=${r.status}`)

  // Validation
  r = await api('POST', '/dv/incident', { token, body: {} })
  assert('POST /dv/incident (missing fields) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  r = await api('POST', '/dv/incident', {
    token,
    body: { incident_type: 'invalid_type', description: 'test', incident_date: '2024-01-01T00:00:00Z' },
  })
  assert('POST /dv/incident (bad incident_type) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  // Create → patch → delete
  r = await api('POST', '/dv/incident', {
    token,
    body: {
      incident_type: 'physical',
      description: 'E2E test incident',
      incident_date: '2024-06-01T10:00:00Z',
      location: 'Home',
    },
  })
  assert('POST /dv/incident (valid) → 201', r.status === 201 && r.body?.ok === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  const incidentId = r.body?.incident?.id
  if (incidentId) {
    r = await api('PATCH', `/dv/incident/${incidentId}`, {
      token,
      body: { description: 'Updated by E2E test' },
    })
    assert('PATCH /dv/incident/:id → 200', r.status === 200 && r.body?.ok === true,
      `status=${r.status}`)

    r = await api('DELETE', `/dv/incident/${incidentId}`, { token })
    assert('DELETE /dv/incident/:id → 200', r.status === 200 && r.body?.ok === true,
      `status=${r.status}`)
  }

  // ─────────────────────────────────────────────
  // 9. MAINTENANCE CALCULATOR
  // ─────────────────────────────────────────────
  section('Maintenance Calculator')

  r = await api('GET', '/maintenance/calculations', { token })
  assert('GET /maintenance/calculations → 200', r.status === 200 && Array.isArray(r.body?.calculations),
    `status=${r.status}`)

  r = await api('GET', '/maintenance/rights', { token })
  assert('GET /maintenance/rights → 200', r.status === 200 && r.body?.ok === true,
    `status=${r.status}`)

  r = await api('GET', '/maintenance/summary', { token })
  assert('GET /maintenance/summary → 200', r.status === 200 && r.body?.ok === true,
    `status=${r.status}`)

  // Validation
  r = await api('POST', '/maintenance/calculate', { token, body: {} })
  assert('POST /maintenance/calculate (missing fields) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  r = await api('POST', '/maintenance/calculate', {
    token,
    body: { husband_income: -1000, wife_income: 20000, marriage_duration_years: 5, number_of_children: 0 },
  })
  assert('POST /maintenance/calculate (negative income) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  // Create → expense → summary → delete
  r = await api('POST', '/maintenance/calculate', {
    token,
    body: {
      husband_gross_income: 80000,
      wife_income: 15000,
      num_children: 1,
      children_ages: [5],
      notes: 'E2E test',
    },
  })
  assert('POST /maintenance/calculate (valid) → 201', r.status === 201 && r.body?.ok === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  const calcId = r.body?.calculation?.id
  if (calcId) {
    r = await api('GET', `/maintenance/calculation/${calcId}`, { token })
    assert('GET /maintenance/calculation/:id → 200', r.status === 200 && r.body?.ok === true,
      `status=${r.status}`)

    // Add expense
    r = await api('POST', '/maintenance/expense', {
      token,
      body: {
        calculation_id: calcId,
        category: 'education',
        description: 'School fees',
        amount: 5000,
        expense_date: '2024-08-01',
      },
    })
    assert('POST /maintenance/expense (valid) → 201', r.status === 201 && r.body?.ok === true,
      `status=${r.status} body=${JSON.stringify(r.body)}`)

    const expenseId = r.body?.expense?.id
    if (expenseId) {
      r = await api('DELETE', `/maintenance/expense/${expenseId}`, { token })
      assert('DELETE /maintenance/expense/:id → 200', r.status === 200 && r.body?.ok === true,
        `status=${r.status}`)
    }

    // Expense validation
    r = await api('POST', '/maintenance/expense', {
      token,
      body: { calculation_id: calcId, category: 'invalid_category', description: 'test', amount: 100, expense_date: '2024-08-01' },
    })
    assert('POST /maintenance/expense (bad category) → 400', r.status === 400,
      `Expected 400, got ${r.status}`)

    // Clean up calculation
    r = await api('DELETE', `/maintenance/calculation/${calcId}`, { token })
    assert('DELETE /maintenance/calculation/:id → 200', r.status === 200 && r.body?.ok === true,
      `status=${r.status}`)
  }

  // ─────────────────────────────────────────────
  // 10. BREAKUP GENERATOR
  // ─────────────────────────────────────────────
  section('Breakup Generator')

  r = await api('GET', '/breakup/templates', { token })
  assert('GET /breakup/templates → 200', r.status === 200 && Array.isArray(r.body?.templates),
    `status=${r.status}`)
  assert('GET /breakup/templates returns 5 templates', r.body?.templates?.length === 5,
    `got ${r.body?.templates?.length}`)

  r = await api('GET', '/breakup/messages', { token })
  assert('GET /breakup/messages → 200', r.status === 200 && Array.isArray(r.body?.messages),
    `status=${r.status}`)

  // Validation
  r = await api('POST', '/breakup/generate', { token, body: {} })
  assert('POST /breakup/generate (missing template_type) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  r = await api('POST', '/breakup/generate', {
    token,
    body: { template_type: 'invalid', tone: 'formal' },
  })
  assert('POST /breakup/generate (bad template_type) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  r = await api('POST', '/breakup/generate', {
    token,
    body: { template_type: 'closure', tone: 'invalid_tone' },
  })
  assert('POST /breakup/generate (bad tone) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  // Invalid UUID delete
  r = await api('DELETE', '/breakup/message/not-a-uuid', { token })
  assert('DELETE /breakup/message/not-a-uuid → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  if (RUN_AI_TESTS) {
    r = await api('POST', '/breakup/generate', {
      token,
      body: {
        template_type: 'closure',
        tone: 'compassionate',
        relationship_type: 'dating',
        relationship_duration: '2 years',
        key_points: 'We have grown apart. I wish you well.',
      },
    })
    assert('POST /breakup/generate (AI) → 201', r.status === 201 && r.body?.ok === true,
      `status=${r.status} body=${JSON.stringify(r.body)}`)

    const msgId = r.body?.message?.id
    if (msgId) {
      r = await api('DELETE', `/breakup/message/${msgId}`, { token })
      assert('DELETE /breakup/message/:id (own) → 200', r.status === 200 && r.body?.ok === true,
        `status=${r.status}`)
    }
  } else {
    skip('POST /breakup/generate (AI call)', 'RUN_AI_TESTS not set')
  }

  // ─────────────────────────────────────────────
  // 11. INCOME TRACKER
  // ─────────────────────────────────────────────
  section('Income Tracker')

  r = await api('GET', '/income/history', { token })
  assert('GET /income/history → 200', r.status === 200 && r.body?.ok === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  // Validation
  r = await api('POST', '/income/log', { token, body: {} })
  assert('POST /income/log (missing fields) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  r = await api('POST', '/income/log', {
    token,
    body: { month_year: 'bad-format', gross_income: 50000 },
  })
  assert('POST /income/log (bad month_year) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  r = await api('POST', '/income/log', {
    token,
    body: { month_year: '2024-06', gross_income: -1000 },
  })
  assert('POST /income/log (negative income) → 400', r.status === 400,
    `Expected 400, got ${r.status}`)

  // Create → delete
  // Use a far-future month unlikely to conflict with real data; deductions/expenses must be JSONB objects
  r = await api('POST', '/income/log', {
    token,
    body: { month_year: '2099-06', gross_income: 75000, deductions: { pf: 5000 }, expenses: { rent: 10000 } },
  })
  assert('POST /income/log (valid) → 201', r.status === 201 && r.body?.ok === true,
    `status=${r.status} body=${JSON.stringify(r.body)}`)

  const incomeId = r.body?.entry?.id
  if (incomeId) {
    r = await api('DELETE', `/income/entry/${incomeId}`, { token })
    assert('DELETE /income/entry/:id → 200', r.status === 200 && r.body?.ok === true,
      `status=${r.status}`)
  }

  // ─────────────────────────────────────────────
  // 12. AI USAGE LOGS — verify logging works
  // ─────────────────────────────────────────────
  section('AI Usage Logs (data integrity)')

  // Query via supabase REST (usage logs are SELECT-able by owner)
  const logsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_usage_logs?select=id,service_type,provider,model,created_at&order=created_at.desc&limit=5`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
    }
  )
  const logs = await logsRes.json()
  assert('ai_usage_logs is queryable by owner', logsRes.status === 200 && Array.isArray(logs),
    `status=${logsRes.status} body=${JSON.stringify(logs).slice(0, 200)}`)

  if (Array.isArray(logs) && logs.length > 0) {
    const providers = [...new Set(logs.map(l => l.provider))]
    console.log(`       → Found ${logs.length} log rows. Providers seen: ${providers.join(', ')}`)
  } else {
    console.log('       → No AI usage logs yet (expected if RUN_AI_TESTS=false)')
  }

  // ─────────────────────────────────────────────
  // RESULTS
  // ─────────────────────────────────────────────
  const total = passed + failed + skipped
  console.log(`\n${'═'.repeat(55)}`)
  console.log(`  Results: ${passed} passed  |  ${failed} failed  |  ${skipped} skipped  |  ${total} total`)
  console.log(`${'═'.repeat(55)}`)

  if (failures.length > 0) {
    console.log('\n❌  Failed tests:')
    for (const f of failures) {
      console.log(`   • ${f.name}`)
      console.log(`     ${f.reason}`)
    }
    process.exit(1)
  } else {
    console.log('\n✅  All tests passed!')
    process.exit(0)
  }
}

run().catch(err => {
  console.error('\n💥  Unexpected error:', err)
  process.exit(1)
})
