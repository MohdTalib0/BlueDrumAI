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

### 1. Install Supabase CLI (or use npx)
```bash
npx supabase login
```

### 2. Link Project
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
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
npx supabase functions deploy waitlist
npx supabase functions deploy risk-check
npx supabase functions deploy health
```

### 5. Update Frontend

Update API base URL in `.env`:

```env
# Old
VITE_API_BASE_URL=http://localhost:3001

# New
VITE_API_BASE_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1
VITE_SUPABASE_ANON_KEY=your-anon-key-here
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

**Note**: Frontend components (`SignupForm.tsx` and `RiskCalculator.tsx`) have been updated to automatically include the Supabase anon key in headers.

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
npx supabase start
curl -X POST http://localhost:54321/functions/v1/waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
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

## Frontend Files Updated

1. `src/components/SignupForm.tsx` - Updated waitlist API call, added anon key header
2. `src/components/RiskCalculator.tsx` - Updated risk-check API call, added anon key header
3. `.env` or `.env.production` - Update API base URL and add `VITE_SUPABASE_ANON_KEY`

## Notes

- Edge Functions automatically handle CORS
- Rate limiting is implemented in-memory (consider Redis for production)
- All environment variables must be set in Supabase dashboard
- Functions use Deno runtime (not Node.js)
- Frontend automatically includes Supabase anon key in requests

## Next Steps

1. Deploy functions to Supabase
2. Update frontend API URLs and add `VITE_SUPABASE_ANON_KEY` to `.env`
3. Test all endpoints
4. Monitor function logs in Supabase dashboard
5. Set up error alerts if needed
