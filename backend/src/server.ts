import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { z } from 'zod'
import { supabaseAdmin } from './supabase'
import { generateRiskCheckAdvice } from './services/ai'
import { requestIdMiddleware } from './middleware/requestId'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { apiLoggerMiddleware } from './middleware/auditLogger'
import { activityTrackerMiddleware } from './middleware/activityTracker'
import { trackSession } from './middleware/sessionTracker'
import { sanitizeEmail, sanitizeAnswers, sanitizeManualInput } from './utils/sanitize'
import authRoutes from './routes/auth'
import vaultRoutes from './routes/vault'
import incomeRoutes from './routes/income'
import analyzeRoutes from './routes/analyze'
import dashboardRoutes from './routes/dashboard'
import exportRoutes from './routes/export'
import healthRoutes from './routes/health'

const app = express()

const PORT = Number(process.env.PORT || 3001)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const isProduction = process.env.NODE_ENV === 'production'

// Trust proxy for accurate IP addresses (Render, Cloudflare, etc.)
app.set('trust proxy', 1)

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
)

// Request ID for tracing
app.use(requestIdMiddleware)

// API request logging (after request ID is set)
app.use(apiLoggerMiddleware)

// Activity tracking
app.use(activityTrackerMiddleware)

// Session tracking (for authenticated routes)
app.use(trackSession)

// CORS configuration - Simplified based on production best practices
const baseOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://www.bluedrumai.com',
  'https://bluedrumai.com',
  'https://api.bluedrumai.com',
]

const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim())
  : []

const allowedOrigins = [
  ...baseOrigins,
  ...corsOrigins,
  ...(FRONTEND_URL && !baseOrigins.includes(FRONTEND_URL) && !corsOrigins.includes(FRONTEND_URL) ? [FRONTEND_URL] : []),
].filter(Boolean)

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      console.warn(`[CORS] Blocked request from origin: ${origin}`)
      return callback(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }),
)

app.use(express.json({ limit: '200kb' }))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/vault', vaultRoutes)
app.use('/api/income', incomeRoutes)
app.use('/api/analyze', analyzeRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/health', healthRoutes)

// Rate limit health checks to prevent abuse
const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
})

app.get('/health', healthLimiter, (_req: express.Request, res: express.Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

app.get('/health/db', healthLimiter, async (_req: express.Request, res: express.Response) => {
  try {
    // Generic health check - simple query without exposing table structure
    // Using a minimal query that doesn't reveal schema details
    const { error } = await supabaseAdmin.from('waitlist').select('id').limit(1)
    
    if (error) {
      return res.status(500).json({ ok: false, db: false })
    }
    return res.json({ ok: true, db: true })
  } catch {
    return res.status(500).json({ ok: false, db: false })
  }
})

const waitlistLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

const WaitlistBodySchema = z.object({
  email: z.string().email().max(254),
  interest: z.enum(['male', 'female', 'both']),
  source: z.string().max(64).optional(),
  meta: z.record(z.unknown()).optional(),
})

app.post('/api/waitlist', waitlistLimiter, async (req: express.Request, res: express.Response) => {
  const parsed = WaitlistBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payload',
      details: parsed.error.flatten(),
    })
  }

  // Sanitize inputs
  const email = sanitizeEmail(parsed.data.email)
  const interest = parsed.data.interest
  const source = (parsed.data.source || 'landing_page').slice(0, 64)
  const meta = parsed.data.meta || null
  
  // Get IP from trusted proxy (trust proxy is set above)
  const ip = req.ip || req.socket.remoteAddress || null
  const userAgent = req.headers['user-agent']?.toString().slice(0, 512) || null

  try {
    // Check if entry already exists to preserve important fields
    const { data: existing } = await supabaseAdmin
      .from('waitlist')
      .select('risk_check_id, source, sources, last_source, meta')
      .eq('email', email)
      .single()

    // Track sources in chronological order
    const existingSources = (existing?.sources as string[]) || []
    const firstSource = existing?.source || source
    const newSources = existing
      ? existingSources.includes(source)
        ? existingSources // Don't duplicate if already exists
        : [...existingSources, source] // Add new source
      : [source] // First time

    // Merge metadata and track risk_check_ids array
    const existingMeta = (existing?.meta as Record<string, unknown>) || {}
    const existingRiskCheckIds = (existingMeta.risk_check_ids as string[]) || []
    const newMeta: Record<string, unknown> = {
      ...existingMeta,
      ...(meta || {}),
    }
    // Preserve all risk_check_ids if they exist
    if (existingRiskCheckIds.length > 0) {
      newMeta.risk_check_ids = existingRiskCheckIds
    }
    // Remove undefined values
    Object.keys(newMeta).forEach((key) => {
      if (newMeta[key] === undefined) delete newMeta[key]
    })

    // Use upsert to avoid duplicate-email failures
    const { error } = await supabaseAdmin
      .from('waitlist')
      .upsert(
        [
          {
            email,
            interest,
            source: firstSource, // Preserve original source (first touch attribution)
            sources: newSources, // Track all sources in order
            last_source: source, // Track most recent source
            risk_check_id: existing?.risk_check_id || null, // Preserve latest risk_check_id
            ip,
            user_agent: userAgent,
            meta: newMeta,
          },
        ],
        { onConflict: 'email' },
      )

    if (error) {
      return res.status(500).json({ ok: false, error: 'Failed to save signup' })
    }

    return res.json({ ok: true })
  } catch {
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
})

// Rate limiting per email for risk checks (3 per 24 hours)
const riskCheckLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email if provided, otherwise by IP
    const email = req.body?.email?.trim()?.toLowerCase()
    return email || req.ip || 'unknown'
  },
})

const RiskCheckBodySchema = z.object({
  email: z.string().email().max(254),
  gender: z.enum(['male', 'female']),
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  manualInput: z.string().max(2000).optional(),
})

app.post('/api/risk-check', riskCheckLimiter, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const parsed = RiskCheckBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payload',
      details: parsed.error.flatten(),
    })
  }

  // Sanitize all inputs to prevent prompt injection
  const email = sanitizeEmail(parsed.data.email)
  const gender = parsed.data.gender
  const answers = sanitizeAnswers(parsed.data.answers)
  const manualInput = sanitizeManualInput(parsed.data.manualInput)

  try {
    // Check if email has exceeded limit (additional check via DB)
    const { data: recentChecks } = await supabaseAdmin
      .from('risk_checks')
      .select('id')
      .eq('email', email)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(3)

    if (recentChecks && recentChecks.length >= 3) {
      return res.status(429).json({
        ok: false,
        error: 'Rate limit exceeded',
        message: 'Maximum 3 risk checks per email per 24 hours. Please try again later.',
      })
    }

    // Get user ID from email (if exists)
    let supabaseUserId: string | null = null
    try {
      const { data: userData } = await supabaseAdmin.from('users').select('id').eq('email', email).single()
      supabaseUserId = userData?.id || null
    } catch {
      // User might not exist yet, that's okay
    }

    // Generate AI response
    const aiResponse = await generateRiskCheckAdvice(
      {
        gender,
        answers,
        manualInput: manualInput || undefined,
      },
      supabaseUserId,
      undefined // Will be set after insert
    )

    // Store in database
    const { data: riskCheck, error: dbError } = await supabaseAdmin
      .from('risk_checks')
      .insert({
        email,
        gender,
        answers,
        manual_input: manualInput,
        ai_response: aiResponse,
        risk_score: aiResponse.riskScore,
        readiness_score: aiResponse.readinessScore,
      })
      .select('id')
      .single()

    if (dbError || !riskCheck) {
      console.error('Failed to save risk check:', dbError)
      // Still return AI response even if DB save fails
    }

    // Also add/update waitlist (if not already there)
    // Track all risk_check_ids in meta array, keep latest in foreign key
    // Use trusted IP (trust proxy is set above)
    const ip = req.ip || req.socket.remoteAddress || null
    const userAgent = req.headers['user-agent']?.toString().slice(0, 512) || null

    const { data: existingWaitlist } = await supabaseAdmin
      .from('waitlist')
      .select('risk_check_id, source, sources, meta, ip, user_agent')
      .eq('email', email)
      .single()

    const existingMeta = (existingWaitlist?.meta as Record<string, unknown>) || {}
    const existingRiskCheckIds = (existingMeta.risk_check_ids as string[]) || []
    const updatedRiskCheckIds = riskCheck?.id
      ? [...existingRiskCheckIds, riskCheck.id] // Add new risk_check_id to array
      : existingRiskCheckIds

    const existingSources = (existingWaitlist?.sources as string[]) || []
    const sourceToAdd = 'risk_calculator'
    const updatedSources = existingSources.includes(sourceToAdd)
      ? existingSources
      : [...existingSources, sourceToAdd]

    await supabaseAdmin
      .from('waitlist')
      .upsert(
        [
          {
            email,
            interest: gender === 'male' ? 'male' : 'female',
            source: existingWaitlist?.source || sourceToAdd, // Preserve original source
            sources: updatedSources, // Track all sources
            last_source: sourceToAdd, // Update last source
            risk_check_id: riskCheck?.id || existingWaitlist?.risk_check_id || null, // Latest risk check
            ip: ip || existingWaitlist?.ip || null, // Use current IP or preserve existing
            user_agent: userAgent || existingWaitlist?.user_agent || null, // Use current UA or preserve existing
            meta: {
              ...existingMeta,
              risk_check_ids: updatedRiskCheckIds, // All risk_check_ids array
              latest_risk_check_id: riskCheck?.id, // Latest one for easy access
            },
          },
        ],
        { onConflict: 'email' },
      )
      .then(() => {}) // Ignore errors

    return res.json({
      ok: true,
      ...aiResponse,
    })
  } catch (error: any) {
    // Error will be handled by errorHandler middleware
    return next(error)
  }
})

// 404 handler
app.use(notFoundHandler)

// Error handler (must be last)
app.use(errorHandler)

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Backend listening on http://localhost:${PORT}`)
  // eslint-disable-next-line no-console
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  // eslint-disable-next-line no-console
  console.log(`🔗 CORS allowed origins:`, allowedOrigins)
  // eslint-disable-next-line no-console
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`)
})


