# Frontend API Migration - Update Summary

## ✅ Completed Updates

1. **API Utility Created** (`src/lib/api.ts`)
   - `getEdgeFunctionUrl()` - Gets correct Edge Function URL
   - `getAuthHeaders()` - Gets headers with anon key
   - `getAuthHeadersWithSession()` - Gets headers with user session token
   - `apiRequest()` - Helper for making authenticated requests

2. **Updated Components**
   - ✅ `src/components/SignupForm.tsx` - Uses Edge Functions
   - ✅ `src/components/RiskCalculator.tsx` - Uses Edge Functions
   - ✅ `src/pages/Dashboard.tsx` - Uses Edge Functions for auth and stats
   - ✅ `src/components/export/ExportButton.tsx` - Uses Edge Functions for PDF exports
   - ✅ `src/pages/dashboard/consent-vault/TimelineView.tsx` - Uses Edge Functions for vault operations

## ⚠️ Remaining Files to Update

### High Priority (Core Functionality)

1. **Authentication & Onboarding**
   - `src/pages/auth/SignIn.tsx` - `/api/auth/me`
   - `src/pages/Onboarding.tsx` - `/api/auth/me`, `/api/auth/sync-user`

2. **Vault**
   - `src/components/vault/FileUploader.tsx` - `/api/vault/upload` (needs FormData handling)

3. **Income Tracker**
   - `src/pages/dashboard/income-tracker/IncomeForm.tsx` - `/api/income/history`, `/api/income/log`
   - `src/pages/dashboard/income-tracker/ExpenseTracker.tsx` - `/api/income/history`, `/api/income/entry/:id`
   - `src/pages/dashboard/income-tracker/AnnualSummary.tsx` - `/api/income/history`
   - `src/pages/dashboard/income-tracker/AffidavitGenerator.tsx` - `/api/income/history`, `/api/income/generate-affidavit`

4. **Chat Analysis**
   - `src/pages/dashboard/red-flag-radar/ChatUpload.tsx` - `/api/auth/me`, `/api/analyze/text`, `/api/analyze/chat`
   - `src/pages/dashboard/red-flag-radar/AnalysisResults.tsx` - `/api/analyze/:id`, `/api/analyze/:id/export`
   - `src/pages/dashboard/red-flag-radar/AnalysisHistory.tsx` - `/api/analyze/history`, `/api/analyze/:id`
   - `src/pages/dashboard/red-flag-radar/CompareAnalyses.tsx` - `/api/analyze/history`, `/api/analyze/compare`
   - `src/pages/dashboard/red-flag-radar/RedFlagExperience.tsx` - `/api/analyze/red-flag-chat`

## Migration Pattern

### Standard API Call

**Before:**
```typescript
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const response = await fetch(`${apiBase}/api/vault/entries`, {
  headers: {
    Authorization: `Bearer ${sessionToken}`,
  },
})
```

**After:**
```typescript
const { getEdgeFunctionUrl, getAuthHeadersWithSession } = await import('../lib/api')
const headers = await getAuthHeadersWithSession()
if (sessionToken) {
  headers['Authorization'] = `Bearer ${sessionToken}`
}
const response = await fetch(`${getEdgeFunctionUrl('vault')}/entries`, {
  headers,
})
```

### File Upload (FormData)

**Before:**
```typescript
const formData = new FormData()
formData.append('file', file)
const response = await fetch(`${apiBase}/api/vault/upload`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${sessionToken}`,
  },
  body: formData,
})
```

**After:**
```typescript
const { getEdgeFunctionUrl, getAuthHeadersWithSession } = await import('../lib/api')
const formData = new FormData()
formData.append('file', file)
formData.append('type', 'photo')

const headers = await getAuthHeadersWithSession()
if (sessionToken) {
  headers['Authorization'] = `Bearer ${sessionToken}`
}
// Don't set Content-Type for FormData - browser will set it automatically
delete headers['Content-Type']

const response = await fetch(`${getEdgeFunctionUrl('vault')}/upload`, {
  method: 'POST',
  headers,
  body: formData,
})
```

### POST with Body

**Before:**
```typescript
const response = await fetch(`${apiBase}/api/income/log`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
})
```

**After:**
```typescript
const { getEdgeFunctionUrl, getAuthHeadersWithSession } = await import('../lib/api')
const headers = await getAuthHeadersWithSession()
if (sessionToken) {
  headers['Authorization'] = `Bearer ${sessionToken}`
}
headers['Content-Type'] = 'application/json'

const response = await fetch(`${getEdgeFunctionUrl('income')}/log`, {
  method: 'POST',
  headers,
  body: JSON.stringify(data),
})
```

## Edge Function Endpoint Mapping

| Old Endpoint | Edge Function | New Path |
|-------------|---------------|----------|
| `/api/auth/me` | `auth` | `/auth/me` |
| `/api/auth/sync-user` | `auth` | `/auth/sync-user` (if exists) or use Supabase client directly |
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
| `/api/analyze/:id/export` | `export` | `/export/analysis` (POST with `{ analysisId }`) |
| `/api/dashboard/stats` | `dashboard` | `/dashboard/stats` |
| `/api/export/vault` | `export` | `/export/vault` |
| `/api/export/affidavit` | `export` | `/export/affidavit` |
| `/api/export/analysis/:id` | `export` | `/export/analysis` (POST with `{ analysisId }`) |

## Notes

1. **Authentication**: The Edge Functions use Supabase JWT tokens. The `getAuthHeadersWithSession()` function automatically gets the session token from Supabase Auth.

2. **Public Endpoints**: `waitlist` and `risk-check` use the anon key (handled by `getAuthHeaders()`).

3. **Protected Endpoints**: All other endpoints require user authentication via session token.

4. **Error Handling**: Edge Functions return JSON with `{ ok: boolean, error?: string, ... }` format. Check `response.ok` and parse JSON for errors.

5. **File Uploads**: For FormData uploads, don't set `Content-Type` header - the browser will set it automatically with the boundary.

## Testing Checklist

After updating each file, test:
- [ ] API call succeeds
- [ ] Authentication works
- [ ] Error handling works
- [ ] Data displays correctly
- [ ] File uploads work (if applicable)
- [ ] PDF downloads work (if applicable)

