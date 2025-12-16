import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { z } from 'zod'
import { supabaseAdmin } from './supabase'

const app = express()

const PORT = Number(process.env.PORT || 3001)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(helmet())
app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin / curl / server-to-server
      if (!origin) return cb(null, true)

      // allow configured frontend URL
      if (origin === FRONTEND_URL) return cb(null, true)

      // allow localhost during development (vite may shift ports)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true)

      return cb(new Error('Not allowed by CORS'))
    },
    credentials: false,
  }),
)
app.use(express.json({ limit: '200kb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
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
})

app.post('/api/waitlist', waitlistLimiter, async (req, res) => {
  const parsed = WaitlistBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payload',
      details: parsed.error.flatten(),
    })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const interest = parsed.data.interest
  const source = (parsed.data.source || 'landing_page').slice(0, 64)
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || null
  const userAgent = req.headers['user-agent']?.toString().slice(0, 512) || null

  try {
    // Use upsert to avoid duplicate-email failures
    const { error } = await supabaseAdmin
      .from('waitlist')
      .upsert(
        [{ email, interest, source, ip, user_agent: userAgent }],
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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`)
  // eslint-disable-next-line no-console
  console.log(`CORS allowed origin: ${FRONTEND_URL}`)
})


