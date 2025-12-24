/**
 * AI Usage Tracker
 * Tracks token usage, costs, and API calls for monitoring and billing
 */

import { supabaseAdmin } from '../supabase'

export interface AIUsageData {
  userId: string | null
  serviceType: 'risk_check' | 'chat_analysis' | 'other'
  provider: 'anthropic' | 'openai'
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  requestSizeBytes?: number
  responseSizeBytes?: number
  responseTimeMs?: number
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, any>
}

// Pricing per 1M tokens (as of 2024)
type Pricing = {
  [key: string]: { input: number; output: number }
}

const PRICING: {
  anthropic: Pricing
  openai: Pricing
} = {
  anthropic: {
    'claude-3-5-sonnet-20240620': {
      input: 3.00, // $3 per 1M input tokens
      output: 15.00, // $15 per 1M output tokens
    },
    'claude-3-opus-20240229': {
      input: 15.00,
      output: 75.00,
    },
    'claude-3-sonnet-20240229': {
      input: 3.00,
      output: 15.00,
    },
    'claude-3-haiku-20240307': {
      input: 0.25,
      output: 1.25,
    },
  },
  openai: {
    'gpt-4': {
      input: 30.00,
      output: 60.00,
    },
    'gpt-4-turbo': {
      input: 10.00,
      output: 30.00,
    },
    'gpt-3.5-turbo': {
      input: 0.50,
      output: 1.50,
    },
    'gpt-4o': {
      input: 5.00,
      output: 15.00,
    },
  },
}

/**
 * Calculate cost based on tokens and model
 */
function calculateCost(
  provider: 'anthropic' | 'openai',
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const providerPricing = PRICING[provider]
  const modelKeys = Object.keys(providerPricing) as Array<keyof typeof providerPricing>
  const modelPricing = providerPricing[model as keyof typeof providerPricing] || providerPricing[modelKeys[0]]

  if (!modelPricing) {
    console.warn(`No pricing found for model ${model}, using default`)
    return { inputCost: 0, outputCost: 0, totalCost: 0 }
  }

  // Calculate cost per token (pricing is per 1M tokens)
  const inputCostPerToken = modelPricing.input / 1_000_000
  const outputCostPerToken = modelPricing.output / 1_000_000

  const inputCost = inputTokens * inputCostPerToken
  const outputCost = outputTokens * outputCostPerToken
  const totalCost = inputCost + outputCost

  return {
    inputCost: Math.round(inputCost * 1_000_000) / 1_000_000, // Round to 6 decimal places
    outputCost: Math.round(outputCost * 1_000_000) / 1_000_000,
    totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
  }
}

/**
 * Log AI usage to database
 */
export async function logAIUsage(usage: AIUsageData): Promise<void> {
  try {
    const costs = calculateCost(usage.provider, usage.model, usage.inputTokens, usage.outputTokens)

    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: usage.userId,
      service_type: usage.serviceType,
      provider: usage.provider,
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
      input_cost: costs.inputCost,
      output_cost: costs.outputCost,
      total_cost: costs.totalCost,
      request_size_bytes: usage.requestSizeBytes,
      response_size_bytes: usage.responseSizeBytes,
      response_time_ms: usage.responseTimeMs,
      resource_type: usage.resourceType,
      resource_id: usage.resourceId,
      metadata: usage.metadata || {},
    })
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log AI usage:', error)
  }
}

/**
 * Get usage statistics for a user
 */
export async function getUserAIUsageStats(userId: string, days: number = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabaseAdmin
    .from('ai_usage_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())

  if (error) {
    throw new Error(`Failed to fetch AI usage stats: ${error.message}`)
  }

  const stats = {
    totalRequests: data?.length || 0,
    totalTokens: data?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
    totalCost: data?.reduce((sum, log) => sum + parseFloat(log.total_cost || 0), 0) || 0,
    byService: {} as Record<string, { count: number; tokens: number; cost: number }>,
    byProvider: {} as Record<string, { count: number; tokens: number; cost: number }>,
  }

  data?.forEach((log) => {
    // By service type
    const service = log.service_type || 'other'
    if (!stats.byService[service]) {
      stats.byService[service] = { count: 0, tokens: 0, cost: 0 }
    }
    stats.byService[service].count++
    stats.byService[service].tokens += log.total_tokens || 0
    stats.byService[service].cost += parseFloat(log.total_cost || 0)

    // By provider
    const provider = log.provider || 'unknown'
    if (!stats.byProvider[provider]) {
      stats.byProvider[provider] = { count: 0, tokens: 0, cost: 0 }
    }
    stats.byProvider[provider].count++
    stats.byProvider[provider].tokens += log.total_tokens || 0
    stats.byProvider[provider].cost += parseFloat(log.total_cost || 0)
  })

  return stats
}

