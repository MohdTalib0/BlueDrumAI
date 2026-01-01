# Supabase Edge Functions Migration

## Quick Start

### 1. Login and Link
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Set Secrets in Supabase Dashboard
Go to **Project Settings > Edge Functions > Secrets**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY1`
- `ANTHROPIC_API_KEY2` (optional)
- `OPENAI_API_KEY` (optional)

### 3. Deploy All Functions
```bash
npx supabase functions deploy waitlist
npx supabase functions deploy risk-check
npx supabase functions deploy health
npx supabase functions deploy auth
npx supabase functions deploy vault
npx supabase functions deploy income
npx supabase functions deploy analyze
npx supabase functions deploy dashboard
npx supabase functions deploy export
```

### 4. Update Frontend `.env`
```env
VITE_API_BASE_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Function URLs

- Waitlist: `/waitlist`
- Risk Check: `/risk-check`
- Health: `/health`
- Auth: `/auth/me` (GET, PATCH)
- Vault: `/vault/entries`, `/vault/upload`, `/vault/entry/:id`
- Income: `/income/log`, `/income/history`, `/income/entry/:id`
- Analyze: `/analyze/chat`, `/analyze/text`, `/analyze/history`, `/analyze/:id`
- Dashboard: `/dashboard/stats`
- Export: `/export/vault`, `/export/affidavit`, `/export/analysis`

## Cost Savings

- **Before (Render)**: ~$7/month after free tier
- **After (Supabase)**: 500K invocations/month FREE, then $0.0000002/invocation
- **Savings**: ~99% reduction

## Implementation Status

✅ **Fully Implemented:**
- Waitlist
- Risk Check
- Health
- Auth (GET /me, PATCH /me)
- Vault (CRUD operations)
- Income (CRUD operations)
- Analyze (History, Get, Delete)
- Dashboard (Stats)

⚠️ **Partially Implemented (Need AI/PDF Libraries):**
- Analyze (Chat/Text analysis - needs AI parsing port)
- Export (PDF generation - needs PDF library port)
- Income (Affidavit generation - needs PDF library port)

## Documentation

See `docs/SUPABASE_EDGE_FUNCTIONS_SETUP.md` for detailed setup instructions.
