# Clerk Production Setup Guide

## Common Issues and Solutions

### 400 Error from Clerk API

If you're seeing `Failed to load resource: the server responded with a status of 400` errors, check the following:

### 1. Verify Your Clerk Publishable Key

**Check your `.env` file:**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...  # Production
# or
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...  # Development
```

**Key format:**
- Production keys start with `pk_live_`
- Test/Development keys start with `pk_test_`
- The key should be from the correct environment (production vs development)

### 2. Configure Clerk Domain and Allowed Origins

**IMPORTANT:** The 400 error usually means your domain isn't configured correctly in Clerk.

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Settings** → **Domains**
4. **Check your Clerk domain:**
   - It should be something like `bluedrumai.clerk.accounts.dev` (default)
   - Or a custom domain like `clerk.bluedrumai.com` if you've set one up
5. **Add Allowed Origins:**
   - `https://www.bluedrumai.com`
   - `https://bluedrumai.com`
   - `http://localhost:5173` (for development)
6. **If using a custom domain (`clerk.bluedrumai.com`):**
   - Make sure DNS is configured correctly
   - Add `VITE_CLERK_DOMAIN=clerk.bluedrumai.com` to your `.env` file

### 3. Configure Application Paths

**CRITICAL WARNING:**
- You **cannot** use Production keys (`pk_live_...`) with a Custom Domain (`clerk.bluedrumai.com`) on **Localhost**.
- Clerk will reject the request with `Invalid HTTP Origin header` because `localhost` is not a subdomain of `bluedrumai.com`.
- **Solution:** Always use Development keys (`pk_test_...`) when running locally. Only use Production keys on your deployed site (`https://www.bluedrumai.com`).

**In Clerk Dashboard → Settings → Paths:**

**Application paths:**
- **Home URL:** `https://www.bluedrumai.com`

**Component paths (use Application Domain, NOT Account Portal):**
- **<SignIn />:** Select "Sign-in page on application domain" → `/sign-in`
- **<SignUp />:** Select "Sign-up page on application domain" → `/sign-up`
- **Signing Out:** Select "Path on application domain" → `/` or `/sign-in`

**Important:** Since you're using custom React sign-in/sign-up pages, use **Application Domain** paths, not Account Portal URLs.

### 4. Verify Redirect URLs

**In Clerk Dashboard → Settings → Domains:**
- Add to **Redirect URLs**:
  - `https://www.bluedrumai.com/onboarding`
  - `https://bluedrumai.com/onboarding`
  - `http://localhost:5173/onboarding` (for development)

### 5. Check Environment Variables

**Frontend `.env` (root directory):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY
# REQUIRED if using custom Clerk domain (e.g., clerk.bluedrumai.com)
VITE_CLERK_DOMAIN=clerk.bluedrumai.com
VITE_API_BASE_URL=https://api.bluedrumai.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Backend `.env` (backend directory):**
```env
CLERK_SECRET_KEY=sk_live_YOUR_PRODUCTION_SECRET_KEY
CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY
FRONTEND_URL=https://www.bluedrumai.com
NODE_ENV=production
```

### 6. Restart Development Server

After updating environment variables:
```bash
# Stop the dev server (Ctrl+C)
# Then restart
npm run dev
```

### 7. Clear Browser Cache

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### 8. Verify Clerk Instance Status

1. Go to Clerk Dashboard
2. Check that your instance is active
3. Verify you're using the correct instance (production vs development)

## Troubleshooting Steps

### Step 1: Check Console for Key Format
Open browser console and look for:
- ✅ `Clerk publishable key loaded: Production` (good)
- ❌ `Invalid Clerk publishable key format` (bad)

### Step 2: Verify Network Requests
1. Open DevTools → Network tab
2. Filter by "clerk"
3. Check if requests to `clerk.bluedrumai.com` are returning 400
4. If yes, the key or domain configuration is incorrect

### Step 3: Test with Test Key
Try temporarily using a test key to verify the setup works:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Step 4: Check Clerk Dashboard Logs
1. Go to Clerk Dashboard → **Logs**
2. Look for errors related to your domain
3. Check for rate limiting or configuration issues

## Production Checklist

- [ ] Clerk production instance created
- [ ] Production publishable key (`pk_live_...`) added to `.env`
- [ ] Production secret key (`sk_live_...`) added to backend `.env`
- [ ] Frontend URLs added to Clerk Allowed Origins
- [ ] Redirect URLs configured in Clerk Dashboard
- [ ] Environment variables updated in deployment platform (Render, Vercel, etc.)
- [ ] Development server restarted after env changes
- [ ] Browser cache cleared

## Still Having Issues?

1. **Double-check key format**: Must start with `pk_live_` for production
2. **Verify domain**: Ensure `bluedrumai.com` is added to Clerk's allowed origins
3. **Check CORS**: Ensure CORS is configured correctly in Clerk Dashboard
4. **Review Clerk logs**: Check Dashboard → Logs for specific error messages
5. **Test locally first**: Use test keys locally before deploying production keys

