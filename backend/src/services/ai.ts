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
async function generateWithClaude(
  anthropicClient: Anthropic,
  input: RiskCheckInput
): Promise<{ response: RiskCheckResponse; usage: { inputTokens: number; outputTokens: number; model: string; responseTimeMs?: number; requestSizeBytes?: number; responseSizeBytes?: number } }> {
  const prompt = buildPrompt(input)
  const systemPrompt =
    'You are a helpful documentation readiness advisor for Indian legal context. You provide factual information about evidence gathering and relevant laws. You never provide legal advice or predict outcomes. Always respond in valid JSON format only.'

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620'
  const startTime = Date.now()

  const message = await anthropicClient.messages.create({
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
  })

  const responseTime = Date.now() - startTime

  // Extract usage information
  const inputTokens = message.usage.input_tokens || 0
  const outputTokens = message.usage.output_tokens || 0

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

  return {
    response: parsed,
    usage: {
      inputTokens,
      outputTokens,
      model,
      responseTimeMs: responseTime,
      requestSizeBytes: JSON.stringify({ prompt, systemPrompt }).length,
      responseSizeBytes: jsonText.length,
    },
  }
}

// OpenAI implementation (kept for fallback/future use)
async function generateWithOpenAI(
  input: RiskCheckInput
): Promise<{ response: RiskCheckResponse; usage: { inputTokens: number; outputTokens: number; model: string; responseTimeMs?: number; requestSizeBytes?: number; responseSizeBytes?: number } }> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = buildPrompt(input)
  const systemPrompt =
    'You are a helpful documentation readiness advisor for Indian legal context. You provide factual information about evidence gathering and relevant laws. You never provide legal advice or predict outcomes. Always respond in valid JSON format only.'

  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
  const startTime = Date.now()

  try {
    const completion = await openai.chat.completions.create({
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
    })

    const responseTime = Date.now() - startTime

    // Extract usage information
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(content) as RiskCheckResponse

    // Validate and sanitize scores
    parsed.riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)))
    parsed.readinessScore = Math.max(0, Math.min(100, Math.round(parsed.readinessScore || 0)))

    return {
      response: parsed,
      usage: {
        inputTokens,
        outputTokens,
        model,
        responseTimeMs: responseTime,
        requestSizeBytes: JSON.stringify({ prompt, systemPrompt }).length,
        responseSizeBytes: content.length,
      },
    }
  } catch (error: any) {
    console.error('OpenAI generation error:', error)
    throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`)
  }
}

// Main function - tries Anthropic keys in order, then falls back to OpenAI
export async function generateRiskCheckAdvice(
  input: RiskCheckInput,
  userId?: string | null,
  resourceId?: string
): Promise<RiskCheckResponse> {
  let result: { response: RiskCheckResponse; usage: any } | null = null
  let provider: 'anthropic' | 'openai' = 'anthropic'

  // Try Anthropic Key 1 first
  if (anthropic1) {
    try {
      result = await generateWithClaude(anthropic1, input)
      provider = 'anthropic'
    } catch (error: any) {
      console.warn('Anthropic Key 1 failed, trying Key 2:', error.message)
      // Fall through to Key 2
    }
  }

  // Try Anthropic Key 2
  if (!result && anthropic2) {
    try {
      result = await generateWithClaude(anthropic2, input)
      provider = 'anthropic'
    } catch (error: any) {
      console.warn('Anthropic Key 2 failed, trying OpenAI fallback:', error.message)
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI if all Anthropic keys failed or are unavailable
  if (!result && openai) {
    try {
      result = await generateWithOpenAI(input)
      provider = 'openai'
    } catch (error: any) {
      console.error('OpenAI fallback also failed:', error.message)
      throw new Error('All AI providers failed. Please check API keys.')
    }
  }

  if (!result) {
    throw new Error('No AI provider configured. Please set ANTHROPIC_API_KEY1, ANTHROPIC_API_KEY2, or OPENAI_API_KEY')
  }

  // Log usage if userId provided
  if (userId && result.usage) {
    const { logAIUsage } = await import('./aiUsageTracker')
    await logAIUsage({
      userId,
      serviceType: 'risk_check',
      provider,
      model: result.usage.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.inputTokens + result.usage.outputTokens,
      inputCost: 0, // Will be calculated in logAIUsage
      outputCost: 0,
      totalCost: 0,
      requestSizeBytes: result.usage.requestSizeBytes,
      responseSizeBytes: result.usage.responseSizeBytes,
      responseTimeMs: result.usage.responseTimeMs,
      resourceType: 'risk_check',
      resourceId,
    })
  }

  return result.response
}

// Chat Analysis Types
export type ChatAnalysisInput = {
  chatText: string
  participants: string[]
  totalMessages: number
  dateRange: { start: string; end: string }
  sampleMessages?: Array<{ sender: string; message: string; date: string }>
}

export type ChatAnalysisResponse = {
  riskScore: number // 0-100
  redFlags: Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    context: string
    keyword?: string
  }>
  keywordsDetected: string[]
  summary: string
  recommendations: string[]
  patternsDetected: Array<{
    pattern: string
    description: string
    examples: string[]
  }>
}

// Build prompt for chat analysis
function buildChatAnalysisPrompt(input: ChatAnalysisInput): string {
  const { chatText, participants, totalMessages, dateRange, sampleMessages } = input
  
  // Smart truncation: Keep beginning (context) and end (most recent), prioritize recent
  // For very long chats, keep first 2000 chars (context) and last 12000 chars (recent activity)
  let truncatedChat = chatText
  if (chatText.length > 15000) {
    const beginning = chatText.slice(0, 2000)
    const end = chatText.slice(-12000)
    truncatedChat = `${beginning}\n\n... [${chatText.length - 14000} characters truncated - showing beginning and most recent messages] ...\n\n${end}`
  } else if (chatText.length > 8000) {
    truncatedChat = `... [earlier messages truncated] ...\n${chatText.slice(-8000)}`
  }
  
  // Include sample messages for context
  const sampleSection = sampleMessages && sampleMessages.length > 0
    ? `\n\nSample Messages (for context):\n${sampleMessages.slice(0, 10).map((m, i) => 
        `${i + 1}. [${m.date}] ${m.sender}: ${m.message.substring(0, 200)}`
      ).join('\n')}`
    : ''

  return `You are an expert forensic communication analyst specializing in identifying potential legal and safety risks in interpersonal communications, with deep expertise in Indian family law and domestic violence patterns. Your analysis will help individuals understand potential risks and take appropriate protective measures.

CHAT METADATA:
- Participants: ${participants.join(', ')}
- Total Messages: ${totalMessages}
- Date Range: ${dateRange.start} to ${dateRange.end}
- Average Messages per Day: ${totalMessages > 0 ? Math.round((totalMessages / Math.max(1, (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)))) : 0}
${sampleSection}

CHAT CONTENT:
${truncatedChat}

ANALYSIS REQUIREMENTS:

1. **Financial Extortion & Demands** (Critical Priority)
   - Direct or indirect demands for money, property, assets
   - Dowry-related demands or references
   - Threats linked to financial demands
   - Pressure tactics for financial gain
   - References to "gifts", "expenses", "contributions" in coercive context

2. **Threats & Intimidation** (Critical Priority)
   - Physical harm threats (explicit or implied)
   - Legal action threats (false cases, police complaints)
   - Suicide threats or self-harm references
   - Threats to reputation or social standing
   - Intimidation through power dynamics

3. **Emotional Manipulation & Gaslighting** (High Priority)
   - Blame-shifting and guilt-tripping
   - Invalidating feelings or experiences
   - Denying previous statements or events
   - Making the victim question their reality
   - Emotional blackmail ("if you love me...")

4. **Isolation & Control** (High Priority)
   - Attempts to cut off from family/friends
   - Controlling who they can meet/talk to
   - Monitoring or restricting activities
   - Creating dependency
   - Social isolation tactics

5. **False Accusations** (Medium Priority)
   - Accusations of infidelity without evidence
   - Character assassination attempts
   - False narratives about behavior
   - Defamation attempts

6. **Harassment Patterns** (Medium Priority)
   - Excessive messaging (bombarding with messages)
   - Stalking behavior (constant checking in)
   - Unwanted contact despite requests to stop
   - Pattern of escalation over time

7. **Property & Asset Demands** (High Priority)
   - Demands for property transfer
   - References to "rights" over assets
   - Pressure for financial documentation
   - Coercive asset-related conversations

8. **Legal Manipulation** (Critical Priority)
   - Threats of false legal cases
   - Misuse of legal processes
   - References to filing complaints
   - Intimidation through legal knowledge

INDIAN LEGAL CONTEXT (Reference only - do not provide legal advice):
- Section 498A IPC: Protection against harassment for dowry
- Domestic Violence Act, 2005: Protection from domestic abuse
- Section 125 CrPC: Maintenance/alimony provisions
- Section 354D IPC: Stalking
- Section 506 IPC: Criminal intimidation
- Information Technology Act: Cyber harassment
- Dowry Prohibition Act, 1961

ANALYSIS APPROACH:
- Look for PATTERNS, not isolated incidents
- Consider ESCALATION over time
- Identify FREQUENCY and INTENSITY
- Note CONTEXT and RELATIONSHIP DYNAMICS
- Consider CULTURAL NUANCES in Indian context
- Distinguish between normal disagreements and concerning patterns

Response format (JSON only, no markdown):
{
  "riskScore": <0-100 integer, where 0=no risk, 100=critical risk>,
  "redFlags": [
    {
      "type": "<Category name>",
      "severity": "<low|medium|high|critical>",
      "message": "<Brief description of the red flag>",
      "context": "<Relevant quote or context from chat>",
      "keyword": "<Optional: specific keyword that triggered this>"
    }
  ],
  "keywordsDetected": ["<keyword1>", "<keyword2>", ...],
  "summary": "<3-4 paragraph comprehensive, empathetic summary. First paragraph: Overall risk assessment. Second paragraph: Key patterns and red flags identified with specific examples. Third paragraph: Escalation trends and frequency analysis. Fourth paragraph: Contextual factors and relationship dynamics observed. Be specific, cite actual examples, and maintain a supportive but factual tone>",
  "recommendations": [
    "<Specific, actionable recommendation 1 tailored to the identified risks>",
    "<Specific recommendation 2 with clear steps>",
    "<Specific recommendation 3 addressing the most critical concerns>",
    "<Specific recommendation 4 for documentation/evidence>",
    "<Specific recommendation 5 for safety measures if risk is high>",
    "<Specific recommendation 6 for legal preparedness if applicable>"
  ],
  "patternsDetected": [
    {
      "pattern": "<Pattern name>",
      "description": "<Description of the pattern>",
      "examples": ["<example quote 1>", "<example quote 2>"]
    }
  ]
}

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON, no markdown, no code blocks, no explanations outside JSON
- Be SPECIFIC: Cite actual quotes, message patterns, and examples from the chat
- Focus on FACTUAL ANALYSIS: What was said, when, how often, in what context
- Consider CULTURAL CONTEXT: Indian family dynamics, social pressures, legal landscape
- Assess ESCALATION: Note if patterns are increasing in frequency or intensity
- Be EMPATHETIC but FACTUAL: Acknowledge the seriousness while remaining objective
- If NO SIGNIFICANT RISKS: Provide thorough analysis with riskScore < 20, but still identify any minor concerns
- RISK SCORING GUIDELINES:
  * 0-20: Minimal risk - normal communication patterns
  * 21-40: Low risk - some concerning elements but manageable
  * 41-60: Moderate risk - clear patterns of concern requiring attention
  * 61-80: High risk - serious patterns requiring immediate action
  * 81-100: Critical risk - immediate safety and legal concerns`
}

// Claude implementation for chat analysis
async function analyzeChatWithClaude(
  anthropicClient: Anthropic,
  input: ChatAnalysisInput
): Promise<{ response: ChatAnalysisResponse; usage: { inputTokens: number; outputTokens: number; model: string; responseTimeMs?: number; requestSizeBytes?: number; responseSizeBytes?: number } }> {
  const prompt = buildChatAnalysisPrompt(input)
  const systemPrompt = 
    'You are an expert communication pattern analyst specializing in identifying potential legal and safety risks in interpersonal communications, particularly in the Indian legal context. You provide factual, evidence-based analysis. Always respond in valid JSON format only.'

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620'
  const startTime = Date.now()

  const message = await anthropicClient.messages.create({
    model,
    max_tokens: 4000, // More tokens for detailed analysis
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const responseTime = Date.now() - startTime

  // Extract usage information
  const inputTokens = message.usage.input_tokens || 0
  const outputTokens = message.usage.output_tokens || 0

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  // Extract JSON from response
  let jsonText = content.text.trim()
  jsonText = jsonText.replace(/^```json\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim()

  const parsed = JSON.parse(jsonText) as ChatAnalysisResponse

  // Validate and sanitize scores
  parsed.riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)))
  
  // Ensure arrays exist
  if (!Array.isArray(parsed.redFlags)) parsed.redFlags = []
  if (!Array.isArray(parsed.keywordsDetected)) parsed.keywordsDetected = []
  if (!Array.isArray(parsed.recommendations)) parsed.recommendations = []
  if (!Array.isArray(parsed.patternsDetected)) parsed.patternsDetected = []
  
  // Ensure summary exists
  if (!parsed.summary || typeof parsed.summary !== 'string') {
    parsed.summary = 'Analysis completed. Review red flags and recommendations for details.'
  }

  return {
    response: parsed,
    usage: {
      inputTokens,
      outputTokens,
      model,
      responseTimeMs: responseTime,
      requestSizeBytes: JSON.stringify({ prompt, systemPrompt }).length,
      responseSizeBytes: jsonText.length,
    },
  }
}

// OpenAI implementation for chat analysis
async function analyzeChatWithOpenAI(
  input: ChatAnalysisInput
): Promise<{ response: ChatAnalysisResponse; usage: { inputTokens: number; outputTokens: number; model: string; responseTimeMs?: number; requestSizeBytes?: number; responseSizeBytes?: number } }> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = buildChatAnalysisPrompt(input)
  const systemPrompt = 
    'You are an expert communication pattern analyst specializing in identifying potential legal and safety risks in interpersonal communications, particularly in the Indian legal context. You provide factual, evidence-based analysis. Always respond in valid JSON format only.'

  const model = process.env.OPENAI_MODEL || 'gpt-4'
  const startTime = Date.now()

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const responseTime = Date.now() - startTime

    // Extract usage information
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(content) as ChatAnalysisResponse

    // Validate and sanitize scores
    parsed.riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)))
    
    // Ensure arrays exist
    if (!Array.isArray(parsed.redFlags)) parsed.redFlags = []
    if (!Array.isArray(parsed.keywordsDetected)) parsed.keywordsDetected = []
    if (!Array.isArray(parsed.recommendations)) parsed.recommendations = []
    if (!Array.isArray(parsed.patternsDetected)) parsed.patternsDetected = []
    
    // Ensure summary exists
    if (!parsed.summary || typeof parsed.summary !== 'string') {
      parsed.summary = 'Analysis completed. Review red flags and recommendations for details.'
    }

    return {
      response: parsed,
      usage: {
        inputTokens,
        outputTokens,
        model,
        responseTimeMs: responseTime,
        requestSizeBytes: JSON.stringify({ prompt, systemPrompt }).length,
        responseSizeBytes: content.length,
      },
    }
  } catch (error: any) {
    console.error('OpenAI chat analysis error:', error)
    throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`)
  }
}

// Main function for chat analysis - tries Anthropic keys in order, then falls back to OpenAI
export async function analyzeChatWithAI(
  input: ChatAnalysisInput,
  userId?: string | null,
  resourceId?: string
): Promise<{ response: ChatAnalysisResponse; usage: { inputTokens: number; outputTokens: number; model: string; provider: 'anthropic' | 'openai'; responseTimeMs?: number; requestSizeBytes?: number; responseSizeBytes?: number } }> {
  let result: { response: ChatAnalysisResponse; usage: any } | null = null
  let provider: 'anthropic' | 'openai' = 'anthropic'

  // Try Anthropic Key 1 first
  if (anthropic1) {
    try {
      result = await analyzeChatWithClaude(anthropic1, input)
      provider = 'anthropic'
    } catch (error: any) {
      console.warn('Anthropic Key 1 failed for chat analysis, trying Key 2:', error.message)
      // Fall through to Key 2
    }
  }

  // Try Anthropic Key 2
  if (!result && anthropic2) {
    try {
      result = await analyzeChatWithClaude(anthropic2, input)
      provider = 'anthropic'
    } catch (error: any) {
      console.warn('Anthropic Key 2 failed for chat analysis, trying OpenAI fallback:', error.message)
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI if all Anthropic keys failed or are unavailable
  if (!result && openai) {
    try {
      result = await analyzeChatWithOpenAI(input)
      provider = 'openai'
    } catch (error: any) {
      console.error('OpenAI fallback also failed for chat analysis:', error.message)
      throw new Error('All AI providers failed. Please check API keys.')
    }
  }

  if (!result) {
    throw new Error('No AI provider configured. Please set ANTHROPIC_API_KEY1, ANTHROPIC_API_KEY2, or OPENAI_API_KEY')
  }

  // Log usage if userId provided
  if (userId && result.usage) {
    const { logAIUsage } = await import('./aiUsageTracker')
    await logAIUsage({
      userId,
      serviceType: 'chat_analysis',
      provider,
      model: result.usage.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.inputTokens + result.usage.outputTokens,
      inputCost: 0, // Will be calculated in logAIUsage
      outputCost: 0,
      totalCost: 0,
      requestSizeBytes: result.usage.requestSizeBytes,
      responseSizeBytes: result.usage.responseSizeBytes,
      responseTimeMs: result.usage.responseTimeMs,
      resourceType: 'chat_analysis',
      resourceId,
    })
  }

  return {
    response: result.response,
    usage: {
      ...result.usage,
      provider,
    },
  }
}

