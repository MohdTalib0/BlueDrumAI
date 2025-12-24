# AI Usage Tracking Implementation ✅

## What Was Implemented

### 1. Database Table (`supabase/migrations/009_add_ai_usage_tracking.sql`)
- **Table**: `ai_usage_logs`
- **Tracks**:
  - Token usage (input, output, total)
  - Cost (input cost, output cost, total cost in USD)
  - Provider (Anthropic/OpenAI)
  - Model used
  - Request/response metadata
  - Response time
  - Related resource (chat_analysis, risk_check)

### 2. AI Usage Tracker Service (`backend/src/services/aiUsageTracker.ts`)
- **Functions**:
  - `logAIUsage()` - Logs usage to database
  - `getUserAIUsageStats()` - Gets usage statistics for a user
  - `calculateCost()` - Calculates cost based on tokens and model pricing

### 3. Updated AI Service (`backend/src/services/ai.ts`)
- **Chat Analysis Functions**:
  - `analyzeChatWithClaude()` - Now returns usage data
  - `analyzeChatWithOpenAI()` - Now returns usage data
  - `analyzeChatWithAI()` - Accepts userId, logs usage automatically

- **Risk Check Functions**:
  - `generateWithClaude()` - Returns usage data
  - `generateWithOpenAI()` - Returns usage data
  - `generateRiskCheckAdvice()` - Accepts userId, logs usage

### 4. Updated Routes (`backend/src/routes/analyze.ts`)
- **Chat Analysis Routes**:
  - `/api/analyze/chat` - Logs usage after analysis
  - `/api/analyze/text` - Logs usage after analysis

### 5. Updated Server (`backend/src/server.ts`)
- **Risk Check Route**:
  - `/api/risk-check` - Logs usage after generation

## Token Usage Captured

### Anthropic (Claude)
- `message.usage.input_tokens`
- `message.usage.output_tokens`

### OpenAI
- `completion.usage.prompt_tokens`
- `completion.usage.completion_tokens`

## Cost Calculation

Pricing per 1M tokens (as of 2024):

### Anthropic Claude
- Claude 3.5 Sonnet: $3 input / $15 output
- Claude 3 Opus: $15 input / $75 output
- Claude 3 Sonnet: $3 input / $15 output
- Claude 3 Haiku: $0.25 input / $1.25 output

### OpenAI
- GPT-4: $30 input / $60 output
- GPT-4 Turbo: $10 input / $30 output
- GPT-3.5 Turbo: $0.50 input / $1.50 output
- GPT-4o: $5 input / $15 output

## Usage Data Stored

For each AI call:
- User ID
- Service type (risk_check, chat_analysis, other)
- Provider (anthropic, openai)
- Model name
- Input/output/total tokens
- Input/output/total cost (USD)
- Request/response sizes
- Response time (ms)
- Related resource ID
- Metadata (JSON)

## Next Steps

1. **Run Migration**: Execute `supabase/migrations/009_add_ai_usage_tracking.sql`
2. **Test**: Make an AI call and verify usage is logged
3. **Dashboard**: Create admin dashboard to view usage stats
4. **Alerts**: Set up alerts for high usage/costs
5. **Quotas**: Implement usage quotas per user

## API Endpoints (Future)

- `GET /api/admin/ai-usage` - Get all usage stats
- `GET /api/admin/ai-usage/user/:id` - Get user-specific stats
- `GET /api/admin/ai-usage/costs` - Get cost breakdown

## Benefits

✅ **Cost Monitoring**: Track AI costs in real-time  
✅ **Usage Analytics**: Understand how AI is being used  
✅ **Resource Optimization**: Identify expensive operations  
✅ **Billing**: Prepare for user billing/quota system  
✅ **Debugging**: Track which models/providers are used  

