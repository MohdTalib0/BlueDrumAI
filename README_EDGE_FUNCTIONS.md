# Supabase Edge Functions Migration

## Quick Start

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login and Link
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Set Secrets in Supabase Dashboard
Go to **Project Settings > Edge Functions > Secrets**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY1`
- `ANTHROPIC_API_KEY2` (optional)
- `OPENAI_API_KEY` (optional)

### 4. Deploy
```bash
supabase functions deploy waitlist
supabase functions deploy risk-check
supabase functions deploy health
```

### 5. Update Frontend `.env`
```env
VITE_API_BASE_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1
```

## Function URLs

- Waitlist: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/waitlist`
- Risk Check: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/risk-check`
- Health: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/health`

## Cost Savings

- **Before (Render)**: ~$7/month after free tier
- **After (Supabase)**: 500K invocations/month FREE, then $0.0000002/invocation
- **Savings**: ~99% reduction

## Documentation

See `docs/SUPABASE_EDGE_FUNCTIONS_SETUP.md` for detailed setup instructions.

