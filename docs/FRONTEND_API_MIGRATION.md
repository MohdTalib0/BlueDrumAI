# Frontend API Migration Guide

## Overview

The frontend needs to be updated to use Supabase Edge Functions instead of the Express backend. All API calls should now use the format:

```
https://{project-ref}.supabase.co/functions/v1/{function-name}
```

## Migration Status

### ✅ Updated Files
- `src/lib/api.ts` - Created utility functions for Edge Functions

### ⚠️ Files Needing Update

All files that use `/api/` endpoints need to be updated:

1. **Authentication & User**
   - `src/pages/auth/SignIn.tsx` - `/api/auth/me`
   - `src/pages/Onboarding.tsx` - `/api/auth/me`, `/api/auth/sync-user`

2. **Dashboard**
   - `src/pages/Dashboard.tsx` - `/api/auth/me`, `/api/dashboard/stats`

3. **Vault**
   - `src/pages/dashboard/consent-vault/TimelineView.tsx` - `/api/vault/entries`, `/api/vault/entry/:id`
   - `src/components/vault/FileUploader.tsx` - `/api/vault/upload`

4. **Income Tracker**
   - `src/pages/dashboard/income-tracker/IncomeForm.tsx` - `/api/income/history`, `/api/income/log`
   - `src/pages/dashboard/income-tracker/ExpenseTracker.tsx` - `/api/income/history`, `/api/income/entry/:id`
   - `src/pages/dashboard/income-tracker/AnnualSummary.tsx` - `/api/income/history`
   - `src/pages/dashboard/income-tracker/AffidavitGenerator.tsx` - `/api/income/history`, `/api/income/generate-affidavit`

5. **Chat Analysis**
   - `src/pages/dashboard/red-flag-radar/ChatUpload.tsx` - `/api/auth/me`, `/api/analyze/text`, `/api/analyze/chat`
   - `src/pages/dashboard/red-flag-radar/AnalysisResults.tsx` - `/api/analyze/:id`, `/api/analyze/:id/export`
   - `src/pages/dashboard/red-flag-radar/AnalysisHistory.tsx` - `/api/analyze/history`, `/api/analyze/:id`
   - `src/pages/dashboard/red-flag-radar/CompareAnalyses.tsx` - `/api/analyze/history`, `/api/analyze/compare`
   - `src/pages/dashboard/red-flag-radar/RedFlagExperience.tsx` - `/api/analyze/red-flag-chat`

6. **Export**
   - `src/components/export/ExportButton.tsx` - `/api/export/vault`, `/api/export/affidavit`, `/api/export/analysis/:id`

## Migration Pattern

### Before (Express Backend)
```typescript
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const response = await fetch(`${apiBase}/api/vault/entries`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
})
```

### After (Supabase Edge Functions)
```typescript
import { getEdgeFunctionUrl, getAuthHeadersWithSession } from '../lib/api'

const url = getEdgeFunctionUrl('vault')
const headers = await getAuthHeadersWithSession()
const response = await fetch(`${url}/entries`, {
  method: 'GET',
  headers: {
    ...headers,
    'Content-Type': 'application/json',
  },
})
```

## Edge Function Endpoints

| Old Endpoint | New Edge Function | Path |
|-------------|-------------------|------|
| `/api/waitlist` | `waitlist` | `/waitlist` |
| `/api/risk-check` | `risk-check` | `/risk-check` |
| `/api/auth/me` | `auth` | `/auth/me` |
| `/api/vault/entries` | `vault` | `/vault/entries` |
| `/api/vault/upload` | `vault` | `/vault/upload` |
| `/api/vault/entry/:id` | `vault` | `/vault/entry/:id` |
| `/api/income/log` | `income` | `/income/log` |
| `/api/income/history` | `income` | `/income/history` |
| `/api/income/entry/:id` | `income` | `/income/entry/:id` |
| `/api/income/generate-affidavit` | `income` | `/income/generate-affidavit` |
| `/api/analyze/chat` | `analyze` | `/analyze/chat` |
| `/api/analyze/text` | `analyze` | `/analyze/text` |
| `/api/analyze/history` | `analyze` | `/analyze/history` |
| `/api/analyze/:id` | `analyze` | `/analyze/:id` |
| `/api/analyze/compare` | `analyze` | `/analyze/compare` |
| `/api/analyze/red-flag-chat` | `analyze` | `/analyze/red-flag-chat` |
| `/api/dashboard/stats` | `dashboard` | `/dashboard/stats` |
| `/api/export/vault` | `export` | `/export/vault` |
| `/api/export/affidavit` | `export` | `/export/affidavit` |
| `/api/export/analysis/:id` | `export` | `/export/analysis` (POST with body) |

## Special Cases

### File Uploads
For file uploads (like vault upload), use `FormData` and don't set `Content-Type` header (browser will set it automatically):

```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('type', 'photo')

const headers = await getAuthHeadersWithSession()
delete headers['Content-Type'] // Let browser set it for FormData

const response = await fetch(`${getEdgeFunctionUrl('vault')}/upload`, {
  method: 'POST',
  headers,
  body: formData,
})
```

### PDF Downloads
For PDF downloads, handle the binary response:

```typescript
const response = await fetch(`${getEdgeFunctionUrl('export')}/vault`, {
  method: 'POST',
  headers: await getAuthHeadersWithSession(),
})

const blob = await response.blob()
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'vault-export.pdf'
a.click()
```

## Environment Variables

Make sure these are set in `.env`:

```env
VITE_SUPABASE_URL=https://{project-ref}.supabase.co
VITE_SUPABASE_ANON_KEY={your-anon-key}
```

## Testing Checklist

- [ ] Waitlist signup works
- [ ] Risk check works
- [ ] User authentication works
- [ ] Dashboard loads stats
- [ ] Vault file upload works
- [ ] Vault entries load
- [ ] Income tracking works
- [ ] Income affidavit generation works
- [ ] Chat analysis works
- [ ] Chat comparison works
- [ ] Red flag chat works
- [ ] PDF exports work (vault, affidavit, analysis)

