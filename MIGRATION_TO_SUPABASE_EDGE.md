# Migration to Supabase Edge Functions

## Summary

Migrated backend from Render Express server to Supabase Edge Functions to reduce costs (Render free hours exhausted).

## What Changed

### Backend Migration
- ✅ Created Supabase Edge Functions structure
- ✅ Migrated `/api/waitlist` → `supabase/functions/waitlist`
- ✅ Migrated `/api/risk-check` → `supabase/functions/risk-check`
- ✅ Migrated `/health` → `supabase/functions/health`
- ✅ Ported AI service to Deno-compatible code
- ✅ Ported sanitization utilities to Deno

### Files Created

```
supabase/
├── config.toml                          # Supabase configuration
├── functions/
│   ├── _shared/
│   │   ├── supabase.ts                  # Supabase client helper
│   │   ├── sanitize.ts                  # Input sanitization
│   │   └── ai.ts                        # AI service (Anthropic/OpenAI)
│   ├── waitlist/
│   │   └── index.ts                     # Waitlist endpoint
│   ├── risk-check/
│   │   └── index.ts                     # Risk check endpoint
│   └── health/
│       └── index.ts                     # Health check endpoint
```

## Deployment Steps

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login and Link Project
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Set Environment Variables in Supabase Dashboard
Go to **Project Settings > Edge Functions > Secrets**:

```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY1=your-key-1
ANTHROPIC_API_KEY2=your-key-2 (optional)
OPENAI_API_KEY=your-openai-key (optional)
```

### 4. Deploy Functions
```bash
supabase functions deploy waitlist
supabase functions deploy risk-check
supabase functions deploy health
```

### 5. Update Frontend

Update API base URL in `.env`:

```env
# Old
VITE_API_BASE_URL=http://localhost:3001

# New
VITE_API_BASE_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1
```

Update API calls in frontend:

**Before:**
```typescript
fetch(`${apiBase}/api/waitlist`, { ... })
fetch(`${apiBase}/api/risk-check`, { ... })
```

**After:**
```typescript
fetch(`${apiBase}/waitlist`, { ... })
fetch(`${apiBase}/risk-check`, { ... })
```

## Function URLs

After deployment:
- Waitlist: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/waitlist`
- Risk Check: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/risk-check`
- Health: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/health`

## Cost Savings

- **Render**: ~$7/month after free tier (750 hours/month)
- **Supabase Edge Functions**: 500K invocations/month FREE, then $0.0000002/invocation
- **Estimated savings**: ~99% for typical usage

## Testing

### Local Testing
```bash
supabase start
curl -X POST http://localhost:54321/functions/v1/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","interest":"male"}'
```

### Production Testing
Test deployed functions directly:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","interest":"male"}'
```

## Frontend Files to Update

1. `src/components/SignupForm.tsx` - Update waitlist API call
2. `src/components/RiskCalculator.tsx` - Update risk-check API call
3. `.env` or `.env.production` - Update API base URL

## Notes

- Edge Functions automatically handle CORS
- Rate limiting is implemented in-memory (consider Redis for production)
- All environment variables must be set in Supabase dashboard
- Functions use Deno runtime (not Node.js)

## Next Steps

1. Deploy functions to Supabase
2. Update frontend API URLs
3. Test all endpoints
4. Monitor function logs in Supabase dashboard
5. Set up error alerts if needed

