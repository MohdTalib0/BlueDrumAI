# Supabase Edge Functions Setup Guide

This guide explains how to migrate from Render backend to Supabase Edge Functions for cost savings.

## Overview

Supabase Edge Functions are serverless functions that run on Deno, providing:
- **Free tier**: 500K invocations/month
- **Low cost**: $0.0000002 per invocation after free tier
- **Fast**: Edge functions run close to users
- **No server management**: Fully managed by Supabase

## Prerequisites

1. Supabase CLI installed: `npm install -g supabase`
2. Supabase project created at https://supabase.com
3. Environment variables configured in Supabase dashboard

## Setup Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref your-project-ref
```

You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/your-project-ref`

### 4. Set Environment Variables

In your Supabase dashboard, go to **Project Settings > Edge Functions > Secrets** and add:

```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY1=your-anthropic-key-1
ANTHROPIC_API_KEY2=your-anthropic-key-2 (optional)
OPENAI_API_KEY=your-openai-key (optional fallback)
ANTHROPIC_MODEL=claude-3-5-sonnet-20240620 (optional)
OPENAI_MODEL=gpt-3.5-turbo (optional)
```

### 5. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy waitlist
supabase functions deploy risk-check
supabase functions deploy health
```

### 6. Test Functions Locally (Optional)

```bash
# Start local Supabase (includes edge functions)
supabase start

# Test locally
curl -X POST http://localhost:54321/functions/v1/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","interest":"male"}'
```

## Function URLs

After deployment, your functions will be available at:

- **Waitlist**: `https://your-project-ref.supabase.co/functions/v1/waitlist`
- **Risk Check**: `https://your-project-ref.supabase.co/functions/v1/risk-check`
- **Health**: `https://your-project-ref.supabase.co/functions/v1/health`

## Frontend Configuration

Update your frontend `.env` file:

```env
VITE_API_BASE_URL=https://your-project-ref.supabase.co/functions/v1
```

Or update the API calls directly:

```typescript
// Old: http://localhost:3001/api/waitlist
// New: https://your-project-ref.supabase.co/functions/v1/waitlist

const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://your-project-ref.supabase.co/functions/v1'
const response = await fetch(`${apiBase}/waitlist`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`, // Optional, but recommended
  },
  body: JSON.stringify({ email, interest, source }),
})
```

## CORS Configuration

Edge Functions automatically handle CORS. The functions include CORS headers that allow all origins. For production, you may want to restrict this:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.bluedrumai.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## Rate Limiting

Edge Functions include basic in-memory rate limiting. For production, consider:
- Using Supabase's built-in rate limiting
- Implementing Redis-based rate limiting
- Using a service like Upstash Redis

## Monitoring

Monitor your Edge Functions in the Supabase dashboard:
- **Edge Functions > Logs**: View function logs
- **Edge Functions > Metrics**: View invocation counts, errors, and latency

## Cost Comparison

### Render (Current)
- Free tier: 750 hours/month (shared across all services)
- After free tier: ~$7/month for basic plan

### Supabase Edge Functions
- Free tier: 500K invocations/month
- After free tier: $0.0000002 per invocation
- Example: 1M invocations/month = ~$0.10/month

**Savings**: ~99% cost reduction for typical usage!

## Migration Checklist

- [ ] Install Supabase CLI
- [ ] Link Supabase project
- [ ] Set environment variables in Supabase dashboard
- [ ] Deploy edge functions
- [ ] Test functions
- [ ] Update frontend API URLs
- [ ] Update CORS configuration if needed
- [ ] Monitor function logs
- [ ] Set up error alerts (optional)

## Troubleshooting

### Function not found
- Ensure function is deployed: `supabase functions deploy function-name`
- Check function name matches URL path

### Environment variables not working
- Variables must be set in Supabase dashboard, not `.env` file
- Restart function after setting secrets

### CORS errors
- Check CORS headers in function code
- Verify frontend origin is allowed

### Rate limiting issues
- Check rate limit logic in function
- Consider using Supabase's built-in rate limiting

## Next Steps

1. Deploy functions to Supabase
2. Update frontend to use new URLs
3. Test thoroughly
4. Monitor usage and costs
5. Consider adding more edge functions for other endpoints

