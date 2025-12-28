// AI service for Edge Functions
// Uses Anthropic Claude or OpenAI

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

function buildPrompt(input: RiskCheckInput): string {
  const { gender, answers, manualInput } = input
  const laws = gender === 'male' ? MEN_LAWS : WOMEN_LAWS
  const cases = gender === 'male' ? MEN_CASES : WOMEN_CASES

  const sanitizedAnswers = JSON.stringify(answers, null, 2)
    .replace(/[<>]/g, '')
    .slice(0, 5000)

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

async function generateWithClaude(input: RiskCheckInput, useKey2: boolean = false): Promise<RiskCheckResponse> {
  const anthropicKey1 = Deno.env.get('ANTHROPIC_API_KEY1')
  const anthropicKey2 = Deno.env.get('ANTHROPIC_API_KEY2')
  const apiKey = useKey2 ? (anthropicKey2 || anthropicKey1) : (anthropicKey1 || anthropicKey2)

  if (!apiKey) {
    throw new Error('Anthropic API key not configured')
  }

  const prompt = buildPrompt(input)
  const systemPrompt =
    'You are a helpful documentation readiness advisor for Indian legal context. You provide factual information about evidence gathering and relevant laws. You never provide legal advice or predict outcomes. Always respond in valid JSON format only.'

  const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20240620'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.content[0]

  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  let jsonText = content.text.trim()
  jsonText = jsonText.replace(/^```json\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim()

  const parsed = JSON.parse(jsonText) as RiskCheckResponse

  // Validate and sanitize scores
  parsed.riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)))
  parsed.readinessScore = Math.max(0, Math.min(100, Math.round(parsed.readinessScore || 0)))

  return parsed
}

async function generateWithOpenAI(input: RiskCheckInput): Promise<RiskCheckResponse> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = buildPrompt(input)
  const systemPrompt =
    'You are a helpful documentation readiness advisor for Indian legal context. You provide factual information about evidence gathering and relevant laws. You never provide legal advice or predict outcomes. Always respond in valid JSON format only.'

  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-3.5-turbo'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model,
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
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from AI')
  }

  const parsed = JSON.parse(content) as RiskCheckResponse

  // Validate and sanitize scores
  parsed.riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)))
  parsed.readinessScore = Math.max(0, Math.min(100, Math.round(parsed.readinessScore || 0)))

  return parsed
}

export async function generateRiskCheckAdvice(input: RiskCheckInput): Promise<RiskCheckResponse> {
  const anthropicKey1 = Deno.env.get('ANTHROPIC_API_KEY1')
  const anthropicKey2 = Deno.env.get('ANTHROPIC_API_KEY2')
  const openaiKey = Deno.env.get('OPENAI_API_KEY')

  // Try Anthropic Key 1 first
  if (anthropicKey1) {
    try {
      return await generateWithClaude(input, false)
    } catch (error: any) {
      console.warn('Anthropic Key 1 failed, trying Key 2:', error.message)
      // Fall through to Key 2
    }
  }

  // Try Anthropic Key 2
  if (anthropicKey2) {
    try {
      return await generateWithClaude(input, true)
    } catch (error: any) {
      console.warn('Anthropic Key 2 failed, trying OpenAI:', error.message)
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI
  if (openaiKey) {
    try {
      return await generateWithOpenAI(input)
    } catch (error: any) {
      console.error('OpenAI also failed:', error.message)
      throw new Error('All AI providers failed. Please check API keys.')
    }
  }

  throw new Error('No AI provider configured. Please set ANTHROPIC_API_KEY1, ANTHROPIC_API_KEY2, or OPENAI_API_KEY')
}

