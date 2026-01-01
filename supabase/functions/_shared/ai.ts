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

async function generateWithClaude(input: RiskCheckInput, useKey2: boolean = false): Promise<{ response: RiskCheckResponse; usage: any }> {
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

  return {
    response: parsed,
    usage: {
      provider: 'anthropic',
      model,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      responseTimeMs: Date.now() - startTime,
    },
  }
}

async function generateWithOpenAI(input: RiskCheckInput): Promise<{ response: RiskCheckResponse; usage: any }> {
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

  return {
    response: parsed,
    usage: {
      provider: 'openai',
      model,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      responseTimeMs: Date.now() - startTime,
    },
  }
}

export async function generateRiskCheckAdvice(input: RiskCheckInput): Promise<{ response: RiskCheckResponse; usage: any }> {
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

// ============================================================================
// CHAT ANALYSIS
// ============================================================================

export type ChatAnalysisInput = {
  chatText: string
  participants: string[]
  totalMessages: number
  dateRange: { start: string; end: string }
  sampleMessages?: Array<{ sender: string; message: string; date: string }>
}

export type ChatAnalysisResponse = {
  riskScore: number
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

function buildChatAnalysisPrompt(input: ChatAnalysisInput): string {
  const { chatText, participants, totalMessages, dateRange, sampleMessages } = input
  
  let truncatedChat = chatText
  if (chatText.length > 15000) {
    const beginning = chatText.slice(0, 2000)
    const end = chatText.slice(-12000)
    truncatedChat = `${beginning}\n\n... [${chatText.length - 14000} characters truncated] ...\n\n${end}`
  } else if (chatText.length > 8000) {
    truncatedChat = `... [earlier messages truncated] ...\n${chatText.slice(-8000)}`
  }
  
  const sampleSection = sampleMessages && sampleMessages.length > 0
    ? `\n\nSample Messages:\n${sampleMessages.slice(0, 10).map((m, i) => 
        `${i + 1}. [${m.date}] ${m.sender}: ${m.message.substring(0, 200)}`
      ).join('\n')}`
    : ''

  return `You are an expert forensic communication analyst specializing in identifying potential legal and safety risks in interpersonal communications, with deep expertise in Indian family law and domestic violence patterns.

CHAT METADATA:
- Participants: ${participants.join(', ')}
- Total Messages: ${totalMessages}
- Date Range: ${dateRange.start} to ${dateRange.end}
${sampleSection}

CHAT CONTENT:
${truncatedChat}

ANALYSIS REQUIREMENTS:
1. Financial Extortion & Demands (Critical)
2. Threats & Intimidation (Critical)
3. Emotional Manipulation & Gaslighting (High)
4. Isolation & Control (High)
5. False Accusations (Medium)
6. Harassment Patterns (Medium)
7. Property & Asset Demands (High)
8. Legal Manipulation (Critical)

INDIAN LEGAL CONTEXT:
- Section 498A IPC, Domestic Violence Act 2005, Section 125 CrPC, Section 354D IPC, Section 506 IPC, Information Technology Act, Dowry Prohibition Act 1961

Response format (JSON only):
{
  "riskScore": <0-100 integer>,
  "redFlags": [{"type": "...", "severity": "low|medium|high|critical", "message": "...", "context": "...", "keyword": "..."}],
  "keywordsDetected": ["..."],
  "summary": "<3-4 paragraph comprehensive summary>",
  "recommendations": ["<specific actionable recommendation>"],
  "patternsDetected": [{"pattern": "...", "description": "...", "examples": ["..."]}]
}

CRITICAL: Return ONLY valid JSON, no markdown, no code blocks.`
}

async function analyzeChatWithClaude(input: ChatAnalysisInput, apiKey: string): Promise<{ response: ChatAnalysisResponse; usage: any }> {
  const prompt = buildChatAnalysisPrompt(input)
  const systemPrompt = 'You are an expert communication pattern analyst specializing in identifying potential legal and safety risks in interpersonal communications, particularly in the Indian legal context. Always respond in valid JSON format only.'

  const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20240620'
  const startTime = Date.now()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
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

  const parsed = JSON.parse(jsonText) as ChatAnalysisResponse
  parsed.riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)))
  
  if (!Array.isArray(parsed.redFlags)) parsed.redFlags = []
  if (!Array.isArray(parsed.keywordsDetected)) parsed.keywordsDetected = []
  if (!Array.isArray(parsed.recommendations)) parsed.recommendations = []
  if (!Array.isArray(parsed.patternsDetected)) parsed.patternsDetected = []
  
  if (!parsed.summary || typeof parsed.summary !== 'string') {
    parsed.summary = 'Analysis completed. Review red flags and recommendations for details.'
  }

  return {
    response: parsed,
    usage: {
      provider: 'anthropic',
      inputTokens: data.usage.input_tokens || 0,
      outputTokens: data.usage.output_tokens || 0,
      model,
      responseTimeMs: Date.now() - startTime,
      requestSizeBytes: JSON.stringify({ prompt, systemPrompt }).length,
      responseSizeBytes: jsonText.length,
    },
  }
}

async function analyzeChatWithOpenAI(input: ChatAnalysisInput): Promise<{ response: ChatAnalysisResponse; usage: any }> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = buildChatAnalysisPrompt(input)
  const systemPrompt = 'You are an expert communication pattern analyst specializing in identifying potential legal and safety risks in interpersonal communications, particularly in the Indian legal context. Always respond in valid JSON format only.'

  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4'
  const startTime = Date.now()

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
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

  const parsed = JSON.parse(content) as ChatAnalysisResponse
  parsed.riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)))
  
  if (!Array.isArray(parsed.redFlags)) parsed.redFlags = []
  if (!Array.isArray(parsed.keywordsDetected)) parsed.keywordsDetected = []
  if (!Array.isArray(parsed.recommendations)) parsed.recommendations = []
  if (!Array.isArray(parsed.patternsDetected)) parsed.patternsDetected = []
  
  if (!parsed.summary || typeof parsed.summary !== 'string') {
    parsed.summary = 'Analysis completed. Review red flags and recommendations for details.'
  }

  return {
    response: parsed,
    usage: {
      provider: 'openai',
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      model,
      responseTimeMs: Date.now() - startTime,
      requestSizeBytes: JSON.stringify({ prompt, systemPrompt }).length,
      responseSizeBytes: content.length,
    },
  }
}

export async function analyzeChatWithAI(input: ChatAnalysisInput): Promise<{ response: ChatAnalysisResponse; usage: any }> {
  const anthropicKey1 = Deno.env.get('ANTHROPIC_API_KEY1')
  const anthropicKey2 = Deno.env.get('ANTHROPIC_API_KEY2')
  const openaiKey = Deno.env.get('OPENAI_API_KEY')

  if (anthropicKey1) {
    try {
      return await analyzeChatWithClaude(input, anthropicKey1)
    } catch (error: any) {
      console.warn('Anthropic Key 1 failed, trying Key 2:', error.message)
    }
  }

  if (anthropicKey2) {
    try {
      return await analyzeChatWithClaude(input, anthropicKey2)
    } catch (error: any) {
      console.warn('Anthropic Key 2 failed, trying OpenAI:', error.message)
    }
  }

  if (openaiKey) {
    try {
      return await analyzeChatWithOpenAI(input)
    } catch (error: any) {
      console.error('OpenAI also failed:', error.message)
      throw new Error('All AI providers failed. Please check API keys.')
    }
  }

  throw new Error('No AI provider configured')
}

// ============================================================================
// COMPARISON ANALYSIS
// ============================================================================

export type ComparisonAnalysisInput = {
  analyses: Array<{
    id: string
    riskScore: number
    redFlags: Array<{ type: string; severity: string; message: string }>
    patternsDetected: Array<{ pattern: string; description: string }>
    summary: string
    recommendations: string[]
    createdAt: string
    platform?: string
  }>
}

export type ComparisonAnalysisResponse = {
  trend: 'improving' | 'worsening' | 'stable' | 'mixed'
  riskTrend: {
    direction: 'increasing' | 'decreasing' | 'stable'
    change: number
    description: string
  }
  commonPatterns: Array<{
    pattern: string
    frequency: number
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
  }>
  escalationDetected: boolean
  escalationDetails?: {
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    evidence: string[]
  }
  insights: string[]
  recommendations: string[]
  summary: string
}

function buildComparisonPrompt(input: ComparisonAnalysisInput): string {
  const { analyses } = input
  const sortedAnalyses = [...analyses].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const analysisData = sortedAnalyses.map((analysis, index) => {
    return `Analysis ${index + 1} (${new Date(analysis.createdAt).toLocaleDateString()}):
- Risk Score: ${analysis.riskScore}/100
- Platform: ${analysis.platform || 'Unknown'}
- Red Flags: ${analysis.redFlags.length} (${analysis.redFlags.map((rf) => `${rf.type} (${rf.severity})`).join(', ')})
- Patterns: ${analysis.patternsDetected.map((p) => p.pattern).join(', ')}
- Summary: ${analysis.summary.substring(0, 300)}...
- Key Recommendations: ${analysis.recommendations.slice(0, 3).join('; ')}`
  }).join('\n---\n')

  return `You are an expert communication pattern analyst specializing in identifying trends and escalation patterns across multiple chat analyses.

You are analyzing ${analyses.length} chat analyses from the same user, spanning from ${new Date(sortedAnalyses[0].createdAt).toLocaleDateString()} to ${new Date(sortedAnalyses[sortedAnalyses.length - 1].createdAt).toLocaleDateString()}.

ANALYSES DATA:
${analysisData}

YOUR TASK:
Analyze these analyses to identify risk trends, pattern evolution, escalation detection, common themes, and comparative insights.

Response format (JSON only):
{
  "trend": "<improving|worsening|stable|mixed>",
  "riskTrend": {"direction": "<increasing|decreasing|stable>", "change": <number>, "description": "..."},
  "commonPatterns": [{"pattern": "...", "frequency": <number>, "severity": "...", "description": "..."}],
  "escalationDetected": <true|false>,
  "escalationDetails": {"severity": "...", "description": "...", "evidence": ["..."]},
  "insights": ["..."],
  "recommendations": ["..."],
  "summary": "..."
}

CRITICAL: Return ONLY valid JSON, no markdown.`
}

async function compareAnalysesWithClaude(input: ComparisonAnalysisInput, apiKey: string): Promise<{ response: ComparisonAnalysisResponse; usage: any }> {
  const prompt = buildComparisonPrompt(input)
  const systemPrompt = 'You are an expert communication pattern analyst specializing in identifying trends and escalation patterns across multiple chat analyses. Always respond in valid JSON format only.'

  const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20240620'
  const startTime = Date.now()

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
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
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
  jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(jsonText) as ComparisonAnalysisResponse

  return {
    response: parsed,
    usage: {
      provider: 'anthropic',
      inputTokens: data.usage.input_tokens || 0,
      outputTokens: data.usage.output_tokens || 0,
      model,
      responseTimeMs: Date.now() - startTime,
    },
  }
}

export async function compareAnalysesWithAI(input: ComparisonAnalysisInput): Promise<{ response: ComparisonAnalysisResponse; usage: any }> {
  const anthropicKey1 = Deno.env.get('ANTHROPIC_API_KEY1')
  const anthropicKey2 = Deno.env.get('ANTHROPIC_API_KEY2')
  const openaiKey = Deno.env.get('OPENAI_API_KEY')

  if (anthropicKey1) {
    try {
      return await compareAnalysesWithClaude(input, anthropicKey1)
    } catch (error: any) {
      console.warn('Anthropic Key 1 failed for comparison:', error.message)
    }
  }

  if (anthropicKey2) {
    try {
      return await compareAnalysesWithClaude(input, anthropicKey2)
    } catch (error: any) {
      console.warn('Anthropic Key 2 failed for comparison:', error.message)
    }
  }

  // OpenAI fallback would go here if needed
  throw new Error('All AI providers failed for comparison')
}

// ============================================================================
// RED FLAG CHAT
// ============================================================================

export type RedFlagChatInput = {
  scenarioType: 'guilt_trip' | 'isolation' | 'gaslighting' | 'financial_control' | 'general'
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  userMessage: string
}

export type RedFlagChatResponse = {
  response: string
  redFlagsDetected: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    description: string
  }>
  educationalNote?: string
}

function buildRedFlagChatPrompt(input: RedFlagChatInput): string {
  const { scenarioType, conversationHistory, userMessage } = input

  const scenarioDescriptions = {
    guilt_trip: 'guilt-tripping and emotional manipulation',
    isolation: 'attempting to isolate the user from friends and family',
    gaslighting: 'gaslighting and blame-shifting',
    financial_control: 'financial manipulation and control',
    general: 'general manipulative behavior',
  }

  const scenarioDescription = scenarioDescriptions[scenarioType] || scenarioDescriptions.general
  const historyText = conversationHistory.length > 0
    ? conversationHistory.slice(-6).map((msg) =>
        `${msg.role === 'user' ? 'User' : 'Red Flag'}: ${msg.content}`
      ).join('\n')
    : 'No previous conversation'

  return `You are simulating a "red flag" person in a relationship - someone who exhibits manipulative, controlling, or abusive behavior patterns. This is for EDUCATIONAL purposes only.

SCENARIO TYPE: ${scenarioDescription}

CONVERSATION HISTORY:
${historyText}

USER'S LATEST MESSAGE:
${userMessage}

YOUR TASK:
Respond as a manipulative person would, demonstrating ${scenarioDescription}. Your response should be realistic, subtle, and educational.

Response format (JSON only):
{
  "response": "<Your manipulative response>",
  "redFlagsDetected": [{"type": "...", "severity": "low|medium|high", "description": "..."}],
  "educationalNote": "<Optional educational note>"
}

CRITICAL: Return ONLY valid JSON, no markdown.`
}

async function generateRedFlagChatWithClaude(input: RedFlagChatInput, apiKey: string): Promise<{ response: RedFlagChatResponse; usage: any }> {
  const prompt = buildRedFlagChatPrompt(input)
  const systemPrompt = 'You are simulating manipulative relationship behavior for educational purposes. Stay in character as a red flag person. Always respond in valid JSON format only.'

  const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20240620'
  const startTime = Date.now()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
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
  jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(jsonText) as RedFlagChatResponse

  return {
    response: parsed,
    usage: {
      provider: 'anthropic',
      inputTokens: data.usage.input_tokens || 0,
      outputTokens: data.usage.output_tokens || 0,
      model,
      responseTimeMs: Date.now() - startTime,
    },
  }
}

export async function generateRedFlagChatResponse(input: RedFlagChatInput): Promise<{ response: RedFlagChatResponse; usage: any }> {
  const anthropicKey1 = Deno.env.get('ANTHROPIC_API_KEY1')
  const anthropicKey2 = Deno.env.get('ANTHROPIC_API_KEY2')
  const openaiKey = Deno.env.get('OPENAI_API_KEY')

  if (anthropicKey1) {
    try {
      return await generateRedFlagChatWithClaude(input, anthropicKey1)
    } catch (error: any) {
      console.warn('Anthropic Key 1 failed for red flag chat:', error.message)
    }
  }

  if (anthropicKey2) {
    try {
      return await generateRedFlagChatWithClaude(input, anthropicKey2)
    } catch (error: any) {
      console.warn('Anthropic Key 2 failed for red flag chat:', error.message)
    }
  }

  throw new Error('All AI providers failed for red flag chat')
}
