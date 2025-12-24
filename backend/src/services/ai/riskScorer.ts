/**
 * Risk Scorer for Chat Analysis
 * Detects red flags and calculates risk scores (0-100)
 */

export interface RedFlag {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  context: string
  keyword?: string
}

export interface RiskAnalysis {
  riskScore: number // 0-100
  redFlags: RedFlag[]
  keywordsDetected: string[]
  summary: string
}

// Red flag keywords and patterns
const RED_FLAG_PATTERNS: {
  category: string
  keywords: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  weight: number
}[] = [
  {
    category: 'Extortion',
    keywords: ['money', 'rupees', 'lakh', 'crore', 'pay', 'payment', 'give me', 'send me', 'transfer', 'bank', 'account', 'cash', 'demand', 'extort'],
    severity: 'critical',
    weight: 25,
  },
  {
    category: 'Threats',
    keywords: ['threat', 'threaten', 'harm', 'hurt', 'kill', 'die', 'suicide', 'police', 'court', 'case', 'file', 'complaint', 'legal', 'lawyer'],
    severity: 'high',
    weight: 20,
  },
  {
    category: 'Emotional Manipulation',
    keywords: ['guilt', 'blame', 'fault', 'your mistake', 'you did', 'because of you', 'you made me', 'i will leave', 'break up', 'divorce'],
    severity: 'medium',
    weight: 15,
  },
  {
    category: 'Isolation',
    keywords: ['don\'t tell', 'keep secret', 'don\'t share', 'your family', 'your friends', 'stay away', 'cut off', 'isolate'],
    severity: 'high',
    weight: 18,
  },
  {
    category: 'False Accusations',
    keywords: ['cheating', 'affair', 'other woman', 'other man', 'betrayal', 'unfaithful', 'lying', 'liar', 'trust'],
    severity: 'medium',
    weight: 12,
  },
  {
    category: 'Property/Dowry Demands',
    keywords: ['property', 'house', 'car', 'jewellery', 'jewelry', 'gold', 'dowry', 'gift', 'demand', 'want', 'need'],
    severity: 'high',
    weight: 20,
  },
  {
    category: 'Intimidation',
    keywords: ['fear', 'afraid', 'scared', 'intimidate', 'control', 'obey', 'listen', 'do as i say', 'my way'],
    severity: 'high',
    weight: 15,
  },
  {
    category: 'Gaslighting',
    keywords: ['you\'re wrong', 'you\'re crazy', 'you\'re imagining', 'that never happened', 'you\'re lying', 'you don\'t remember'],
    severity: 'medium',
    weight: 10,
  },
]

/**
 * Analyze chat and calculate risk score
 */
export function analyzeChatRisk(chatText: string, parsedMessages: any[]): RiskAnalysis {
  const lowerText = chatText.toLowerCase()
  const redFlags: RedFlag[] = []
  const keywordsDetected = new Set<string>()

  let totalRiskScore = 0
  let flagCount = 0

  // Check each pattern category
  for (const pattern of RED_FLAG_PATTERNS) {
    const foundKeywords: string[] = []

    for (const keyword of pattern.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = lowerText.match(regex)

      if (matches && matches.length > 0) {
        foundKeywords.push(keyword)
        keywordsDetected.add(keyword)

        // Find context (surrounding text)
        const keywordIndex = lowerText.indexOf(keyword.toLowerCase())
        const contextStart = Math.max(0, keywordIndex - 50)
        const contextEnd = Math.min(lowerText.length, keywordIndex + keyword.length + 50)
        const context = chatText.substring(contextStart, contextEnd).trim()

        // Calculate severity based on frequency and context
        const frequency = matches.length
        const severity = calculateSeverity(pattern.severity, frequency, context)

        redFlags.push({
          type: pattern.category,
          severity,
          message: `Detected ${pattern.category.toLowerCase()} pattern: "${keyword}"`,
          context: context.length > 100 ? context.substring(0, 100) + '...' : context,
          keyword,
        })

        // Add to risk score (weighted by frequency)
        totalRiskScore += pattern.weight * Math.min(frequency, 3) // Cap frequency multiplier at 3
        flagCount++
      }
    }

    // If multiple keywords from same category found, increase severity
    if (foundKeywords.length > 1) {
      const lastFlag = redFlags[redFlags.length - 1]
      if (lastFlag && lastFlag.type === pattern.category) {
        lastFlag.severity = escalateSeverity(lastFlag.severity)
        totalRiskScore += pattern.weight * 0.5 // Additional weight for multiple keywords
      }
    }
  }

  // Check for message frequency patterns (potential harassment)
  const messageFrequency = analyzeMessageFrequency(parsedMessages)
  if (messageFrequency.isExcessive) {
    redFlags.push({
      type: 'Harassment',
      severity: 'medium',
      message: `Excessive messaging detected: ${messageFrequency.details}`,
      context: `Average ${messageFrequency.avgPerDay} messages per day`,
    })
    totalRiskScore += 10
  }

  // Normalize risk score to 0-100
  const normalizedScore = Math.min(100, Math.round(totalRiskScore))

  // Generate summary
  const summary = generateSummary(normalizedScore, redFlags, keywordsDetected.size)

  return {
    riskScore: normalizedScore,
    redFlags: redFlags.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity)),
    keywordsDetected: Array.from(keywordsDetected),
    summary,
  }
}

/**
 * Calculate severity based on frequency and context
 */
function calculateSeverity(
  baseSeverity: 'low' | 'medium' | 'high' | 'critical',
  frequency: number,
  context: string
): 'low' | 'medium' | 'high' | 'critical' {
  // Check context for intensifiers
  const intensifiers = ['must', 'will', 'definitely', 'surely', 'promise', 'guarantee']
  const hasIntensifier = intensifiers.some((word) => context.toLowerCase().includes(word))

  if (baseSeverity === 'critical') return 'critical'
  if (baseSeverity === 'high' && (frequency > 2 || hasIntensifier)) return 'critical'
  if (baseSeverity === 'medium' && frequency > 3) return 'high'
  if (baseSeverity === 'low' && frequency > 2) return 'medium'

  return baseSeverity
}

/**
 * Escalate severity level
 */
function escalateSeverity(severity: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
  switch (severity) {
    case 'low':
      return 'medium'
    case 'medium':
      return 'high'
    case 'high':
      return 'critical'
    default:
      return severity
  }
}

/**
 * Get severity weight for sorting
 */
function severityWeight(severity: 'low' | 'medium' | 'high' | 'critical'): number {
  switch (severity) {
    case 'critical':
      return 4
    case 'high':
      return 3
    case 'medium':
      return 2
    case 'low':
      return 1
  }
}

/**
 * Analyze message frequency patterns
 */
function analyzeMessageFrequency(messages: any[]): {
  isExcessive: boolean
  avgPerDay: number
  details: string
} {
  if (messages.length === 0) {
    return { isExcessive: false, avgPerDay: 0, details: '' }
  }

  // Group messages by date
  const messagesByDate = new Map<string, number>()
  messages.forEach((msg) => {
    const date = msg.date
    messagesByDate.set(date, (messagesByDate.get(date) || 0) + 1)
  })

  const totalDays = messagesByDate.size
  const avgPerDay = totalDays > 0 ? messages.length / totalDays : 0

  // Check for excessive messaging (more than 50 messages per day average)
  const isExcessive = avgPerDay > 50

  return {
    isExcessive,
    avgPerDay: Math.round(avgPerDay * 10) / 10,
    details: `${messages.length} messages over ${totalDays} days`,
  }
}

/**
 * Generate analysis summary
 */
function generateSummary(riskScore: number, redFlags: RedFlag[], keywordCount: number): string {
  const criticalFlags = redFlags.filter((f) => f.severity === 'critical').length
  const highFlags = redFlags.filter((f) => f.severity === 'high').length

  if (riskScore >= 80) {
    return `CRITICAL RISK: ${criticalFlags} critical and ${highFlags} high-severity red flags detected. ${keywordCount} concerning keywords found. Immediate attention recommended.`
  } else if (riskScore >= 60) {
    return `HIGH RISK: ${highFlags} high-severity red flags detected. ${keywordCount} concerning keywords found. Review recommended.`
  } else if (riskScore >= 40) {
    return `MODERATE RISK: ${redFlags.length} red flags detected. ${keywordCount} concerning keywords found. Monitor situation.`
  } else if (riskScore >= 20) {
    return `LOW RISK: ${redFlags.length} minor red flags detected. ${keywordCount} keywords found. Stay vigilant.`
  } else {
    return `MINIMAL RISK: No significant red flags detected. Chat appears relatively safe.`
  }
}

