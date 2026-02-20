import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'
import { callOpenRouter, parseJSON } from '../_shared/ai.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts'
import { checkUsageLimit, incrementUsageSimple, limitReachedResponse } from '../_shared/subscription.ts'

const VALID_TEMPLATE_TYPES = ['separation', 'divorce_intent', 'no_contact', 'closure', 'mutual_separation'] as const
const VALID_TONES = ['formal', 'compassionate', 'firm', 'neutral'] as const
const VALID_RELATIONSHIP_TYPES = ['arranged_marriage', 'love_marriage', 'live_in', 'dating', 'other'] as const

type TemplateType = typeof VALID_TEMPLATE_TYPES[number]
type Tone = typeof VALID_TONES[number]

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  separation: 'Separation Notice',
  divorce_intent: 'Intent to Divorce',
  no_contact: 'No Contact Notice',
  closure: 'Closure Letter',
  mutual_separation: 'Mutual Separation Agreement',
}

const TONE_LABELS: Record<Tone, string> = {
  formal: 'Formal & Legal',
  compassionate: 'Compassionate',
  firm: 'Firm & Direct',
  neutral: 'Neutral & Objective',
}

// Static templates returned without AI
const STATIC_TEMPLATES = [
  {
    id: 'tpl_separation',
    type: 'separation',
    label: 'Separation Notice',
    tone: 'formal',
    description: 'A formal notice of intent to live separately, usable under Indian law.',
    preview: 'This letter formally communicates my decision to live separately from this point forward...',
  },
  {
    id: 'tpl_closure',
    type: 'closure',
    label: 'Closure Letter',
    tone: 'compassionate',
    description: 'A compassionate message acknowledging the end of the relationship respectfully.',
    preview: 'I am writing this with careful thought and respect for the time we shared...',
  },
  {
    id: 'tpl_divorce_intent',
    type: 'divorce_intent',
    label: 'Intent to Divorce',
    tone: 'formal',
    description: 'Formal communication of intent to initiate divorce proceedings.',
    preview: 'This letter serves as formal notice of my intent to initiate legal dissolution proceedings...',
  },
  {
    id: 'tpl_no_contact',
    type: 'no_contact',
    label: 'No Contact Notice',
    tone: 'firm',
    description: 'A firm, clear request to cease all communication.',
    preview: 'This letter formally requests that you cease all direct and indirect communication with me...',
  },
  {
    id: 'tpl_mutual',
    type: 'mutual_separation',
    label: 'Mutual Separation',
    tone: 'neutral',
    description: 'A neutral proposal for an amicable, mutually agreed separation.',
    preview: 'I am writing to propose a mutually agreed separation so that both of us may move forward...',
  },
]

function buildGenerationPrompt(
  templateType: TemplateType,
  tone: Tone,
  relationshipType: string | null,
  relationshipDuration: string | null,
  keyPoints: string | null,
): string {
  const templateLabel = TEMPLATE_LABELS[templateType]
  const toneLabel = TONE_LABELS[tone]

  const toneGuidance: Record<Tone, string> = {
    formal: 'Use formal, professional language suitable for a legal document. Avoid emotional language.',
    compassionate: 'Use kind, empathetic language. Acknowledge shared history with respect. Avoid blame.',
    firm: 'Be clear and direct. State your position without ambiguity. Do not invite debate or negotiation.',
    neutral: 'Use balanced, objective language. Present facts without emotional charge.',
  }

  const legalSafetyRules = `
CRITICAL LEGAL SAFETY RULES — you MUST follow all of these:
1. Do NOT include any admissions of fault, guilt, or wrongdoing
2. Do NOT include financial promises, asset commitments, or maintenance agreements
3. Do NOT include threats, ultimatums, or coercive language
4. Do NOT include statements that could constitute harassment or defamation
5. Do NOT predict legal outcomes or make legal claims
6. Do NOT include the other party's name (use "you" / "the recipient")
7. Use "I" statements that express decisions, not accusations
8. Keep the message within 300-400 words`

  return `You are a professional legal document assistant specializing in Indian personal law. Generate a legally safe, well-structured ${templateLabel} message.

Message Type: ${templateLabel}
Tone: ${toneLabel} — ${toneGuidance[tone]}
${relationshipType ? `Relationship Type: ${relationshipType.replace(/_/g, ' ')}` : ''}
${relationshipDuration ? `Relationship Duration: ${relationshipDuration}` : ''}
${keyPoints ? `Points to include (paraphrase, do not copy verbatim): ${keyPoints}` : ''}

${legalSafetyRules}

Structure the message with:
- Opening: Clear statement of purpose
- Body: Core message (2-3 paragraphs)
- Closing: Brief, respectful close

After the message, provide a "Legal Notes" section (2-3 bullet points) with important advice about sharing or using this message.

Format your response as JSON (no markdown):
{
  "message": "<the generated message text, use \\n for line breaks>",
  "legalNotes": "<2-3 bullet points of legal caution, separated by \\n>"
}`
}

async function generateWithAI(prompt: string) {
  const result = await callOpenRouter(
    [{ role: 'user', content: prompt }],
    { maxTokens: 1024 },
  )

  try {
    const parsed = parseJSON<{ message: string; legalNotes: string }>(result.text)
    return {
      message: typeof parsed.message === 'string' ? parsed.message.trim() : '',
      legalNotes: typeof parsed.legalNotes === 'string' ? parsed.legalNotes.trim() : '',
      usage: result.usage,
    }
  } catch {
    return { message: result.text.trim(), legalNotes: '', usage: result.usage }
  }
}

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

    async function logAiUsage(usage: { provider: string; model: string; inputTokens: number; outputTokens: number; responseTimeMs: number }, resourceId?: string) {
      try {
        await supabase.from('ai_usage_logs').insert({
          user_id: userId,
          provider: usage.provider,
          model: usage.model,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          total_tokens: usage.inputTokens + usage.outputTokens,
          response_time_ms: usage.responseTimeMs,
          service_type: 'breakup_generator',
          resource_type: 'breakup_message',
          resource_id: resourceId || null,
          input_cost: null,
          output_cost: null,
          total_cost: null,
        })
      } catch (e) {
        console.error('Failed to log AI usage', e)
      }
    }

    // GET /templates - Return static templates (no AI, no rate limit)
    if (url.pathname.endsWith('/templates') && req.method === 'GET') {
      return new Response(
        JSON.stringify({ ok: true, templates: STATIC_TEMPLATES }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /generate - AI-generate a message and save it
    if (url.pathname.endsWith('/generate') && req.method === 'POST') {
      const rl = checkRateLimit(userId, 'breakup:generate', 10, 60_000)
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, corsHeaders)

      const subLimit = await checkUsageLimit(userId, 'breakup')
      if (!subLimit.allowed) return limitReachedResponse('breakup', subLimit, corsHeaders)

      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { template_type, tone, relationship_type, relationship_duration, key_points } = body

      if (!template_type || !VALID_TEMPLATE_TYPES.includes(template_type as TemplateType)) {
        return new Response(
          JSON.stringify({ ok: false, error: `template_type must be one of: ${VALID_TEMPLATE_TYPES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!tone || !VALID_TONES.includes(tone as Tone)) {
        return new Response(
          JSON.stringify({ ok: false, error: `tone must be one of: ${VALID_TONES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const safeRelationshipType =
        relationship_type && VALID_RELATIONSHIP_TYPES.includes(relationship_type as typeof VALID_RELATIONSHIP_TYPES[number])
          ? String(relationship_type)
          : null

      const safeRelationshipDuration =
        typeof relationship_duration === 'string' ? relationship_duration.trim().slice(0, 100) : null

      const safeKeyPoints =
        typeof key_points === 'string' ? key_points.trim().slice(0, 1000) : null

      const prompt = buildGenerationPrompt(
        template_type as TemplateType,
        tone as Tone,
        safeRelationshipType,
        safeRelationshipDuration,
        safeKeyPoints,
      )

      let generated: Awaited<ReturnType<typeof generateWithAI>>
      try {
        generated = await generateWithAI(prompt)
      } catch (aiErr) {
        console.error('AI generation failed:', aiErr)
        return new Response(
          JSON.stringify({ ok: false, error: 'AI generation failed. Please try again.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!generated.message || generated.message.length < 50) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Generated message was too short. Please try again.' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('breakup_messages')
        .insert({
          user_id: userId,
          template_type: template_type as string,
          tone: tone as string,
          relationship_type: safeRelationshipType,
          relationship_duration: safeRelationshipDuration,
          key_points: safeKeyPoints,
          generated_message: generated.message,
          legal_notes: generated.legalNotes || null,
        })
        .select('id, template_type, tone, generated_message, legal_notes, created_at')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log AI usage — fire and forget, never block the response
      await logAiUsage(generated.usage, data.id)
      await incrementUsageSimple(userId, 'breakup').catch(() => {})

      return new Response(
        JSON.stringify({ ok: true, message: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /messages - List saved messages
    if (url.pathname.endsWith('/messages') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('breakup_messages')
        .select('id, template_type, tone, relationship_type, relationship_duration, generated_message, legal_notes, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, messages: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /message/:id
    if (url.pathname.includes('/message/') && req.method === 'DELETE') {
      const messageId = url.pathname.split('/message/')[1]

      if (!messageId || !/^[0-9a-fA-F-]{36}$/.test(messageId)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid message ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabase
        .from('breakup_messages')
        .delete()
        .eq('id', messageId)
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
    console.error('Breakup function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
