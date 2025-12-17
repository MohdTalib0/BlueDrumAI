import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

// Claude (Anthropic) - Multiple keys for fallback
const anthropicKey1 = process.env.ANTHROPIC_API_KEY1
const anthropicKey2 = process.env.ANTHROPIC_API_KEY2
const anthropic1 = anthropicKey1 ? new Anthropic({ apiKey: anthropicKey1 }) : null
const anthropic2 = anthropicKey2 ? new Anthropic({ apiKey: anthropicKey2 }) : null

// OpenAI - Final fallback provider
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

type RiskCheckInput = {
  gender: 'male' | 'female'
  answers: Record<string, string | string[]>
  manualInput?: string
}

type RiskCheckResponse = {
  riskScore: number
  readinessScore: number
  summary: string
  whatToDoNow: string[]
  relevantLaws: Array<{
    law: string
    relevance: string
    note?: string
  }>
  caseExamples: Array<{
    case: string
    relevance: string
    takeaway: string
  }>
  documentationChecklist: string[]
  safetyNote?: string
}

const MEN_LAWS = [
  'Section 498A IPC - Protection against false harassment cases',
  'Section 375 IPC - Rape on pretext of marriage',
  'Section 125 CrPC - Maintenance/alimony provisions',
  'Rajnesh v. Neha (2020) - Supreme Court guidelines on maintenance calculation',
  'Pre-nuptial agreements (limited enforceability in India)',
]

const WOMEN_LAWS = [
  'Section 498A IPC - Dowry harassment and cruelty',
  'Dowry Prohibition Act, 1961 - Prohibition of dowry',
  'Domestic Violence Act, 2005 - Protection from domestic violence',
  'Section 125 CrPC - Maintenance rights',
  'Section 304B IPC - Dowry death',
]

const MEN_CASES = [
  'Rajnesh v. Neha (2020) - Fair maintenance calculation based on disposable income',
  'Various High Court cases on false 498A - Importance of evidence documentation',
]

const WOMEN_CASES = [
  'Various High Court cases on dowry harassment - Evidence requirements',
  'Domestic Violence Act cases - Documentation of incidents',
]

// Shared prompt builder
function buildPrompt(input: RiskCheckInput): string {
  const { gender, answers, manualInput } = input
  const laws = gender === 'male' ? MEN_LAWS : WOMEN_LAWS
  const cases = gender === 'male' ? MEN_CASES : WOMEN_CASES

  // Sanitize answers JSON to prevent injection
  const sanitizedAnswers = JSON.stringify(answers, null, 2)
    .replace(/[<>]/g, '') // Remove potential HTML/script tags
    .slice(0, 5000) // Limit size

  // Sanitize manual input
  const sanitizedManualInput = manualInput
    ? manualInput.replace(/[<>]/g, '').slice(0, 2000)
    : ''

  return `You are a documentation readiness advisor for Indian legal context. You help people understand what evidence to gather and what laws might be relevant. You are NOT a lawyer and do NOT provide legal advice.

User Context:
- Gender: ${gender === 'male' ? 'Men' : 'Women'}
- Relationship stage and signals: ${sanitizedAnswers}
${sanitizedManualInput ? `- Additional context: ${sanitizedManualInput}` : ''}

Available Indian Laws (use only if relevant):
${laws.map((l) => `- ${l}`).join('\n')}

Available Case Examples (use only if relevant):
${cases.map((c) => `- ${c}`).join('\n')}

Generate a comprehensive, empathetic response in JSON format. Be specific to their situation. Focus on documentation and evidence gathering. Never predict legal outcomes.

Response format (JSON only, no markdown):
{
  "riskScore": <0-100 integer based on signals they mentioned>,
  "readinessScore": <0-100 integer based on evidence they have>,
  "summary": "<2-3 paragraph personalized summary addressing their specific situation. Be empathetic but factual.>",
  "whatToDoNow": [
    "<Specific action 1 tailored to their answers>",
    "<Specific action 2>",
    "<Specific action 3>",
    "<Specific action 4>",
    "<Specific action 5>"
  ],
  "relevantLaws": [
    {
      "law": "<Law name>",
      "relevance": "<Why this law is relevant to their specific situation>",
      "note": "<Important caveat or limitation>"
    }
  ],
  "caseExamples": [
    {
      "case": "<Case name>",
      "relevance": "<How this case relates to their situation>",
      "takeaway": "<Key lesson from this case>"
    }
  ],
  "documentationChecklist": [
    "<Specific evidence item 1>",
    "<Specific evidence item 2>",
    "<Specific evidence item 3>",
    "<Specific evidence item 4>"
  ],
  "safetyNote": "<Only include if they mentioned violence or self-harm threats. Include helpline numbers and safety resources.>"
}

IMPORTANT:
- Return ONLY valid JSON, no markdown, no code blocks
- Be specific to their answers, not generic
- If they mentioned violence/threats, include safetyNote
- Focus on documentation and evidence, not legal predictions
- Use empathetic but factual tone
- Cite real Indian laws and cases only if relevant`
}

// Claude (Anthropic) implementation - accepts Anthropic client instance
async function generateWithClaude(anthropicClient: Anthropic, input: RiskCheckInput): Promise<RiskCheckResponse> {
  const prompt = buildPrompt(input)
  const systemPrompt =
    'You are a helpful documentation readiness advisor for Indian legal context. You provide factual information about evidence gathering and relevant laws. You never provide legal advice or predict outcomes. Always respond in valid JSON format only.'

  const message = await anthropicClient.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
    max_tokens: 2000,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  // Claude may return JSON wrapped in markdown, so we extract it
  let jsonText = content.text.trim()
  // Remove markdown code blocks if present
  jsonText = jsonText.replace(/^```json\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim()

  const parsed = JSON.parse(jsonText) as RiskCheckResponse

  // Validate and sanitize scores
  parsed.riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)))
  parsed.readinessScore = Math.max(0, Math.min(100, Math.round(parsed.readinessScore || 0)))

  return parsed
}

// OpenAI implementation (kept for fallback/future use)
async function generateWithOpenAI(input: RiskCheckInput): Promise<RiskCheckResponse> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = buildPrompt(input)
  const systemPrompt =
    'You are a helpful documentation readiness advisor for Indian legal context. You provide factual information about evidence gathering and relevant laws. You never provide legal advice or predict outcomes. Always respond in valid JSON format only.'

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(content) as RiskCheckResponse

    // Validate and sanitize scores
    parsed.riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)))
    parsed.readinessScore = Math.max(0, Math.min(100, Math.round(parsed.readinessScore || 0)))

    return parsed
  } catch (error: any) {
    console.error('OpenAI generation error:', error)
    throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`)
  }
}

// Main function - tries Anthropic keys in order, then falls back to OpenAI
export async function generateRiskCheckAdvice(input: RiskCheckInput): Promise<RiskCheckResponse> {
  // Try Anthropic Key 1 first
  if (anthropic1) {
    try {
      return await generateWithClaude(anthropic1, input)
    } catch (error: any) {
      console.warn('Anthropic Key 1 failed, trying Key 2:', error.message)
      // Fall through to Key 2
    }
  }

  // Try Anthropic Key 2
  if (anthropic2) {
    try {
      return await generateWithClaude(anthropic2, input)
    } catch (error: any) {
      console.warn('Anthropic Key 2 failed, trying OpenAI fallback:', error.message)
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI if all Anthropic keys failed or are unavailable
  if (openai) {
    try {
      return await generateWithOpenAI(input)
    } catch (error: any) {
      console.error('OpenAI fallback also failed:', error.message)
      throw new Error('All AI providers failed. Please check API keys.')
    }
  }

  throw new Error('No AI provider configured. Please set ANTHROPIC_API_KEY1, ANTHROPIC_API_KEY2, or OPENAI_API_KEY')
}

