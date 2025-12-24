# Clerk Paths Configuration Guide

## Understanding Clerk Paths

Clerk has two types of authentication pages:
1. **Account Portal** (`accounts.bluedrumai.com`) - Clerk's hosted pages
2. **Application Domain** (`www.bluedrumai.com/sign-in`) - Your custom pages

Since you're using custom sign-in/sign-up pages in your React app, you should use **Application Domain** paths.

## Recommended Configuration

### In Clerk Dashboard → Settings → Paths

**Application paths:**
- **Home URL:** `https://www.bluedrumai.com` ✅ (already correct)

**Component paths:**

**<SignIn />:**
- ✅ **Sign-in page on application domain:** `/sign-in`
- ❌ Don't use Account Portal URL

**<SignUp />:**
- ✅ **Sign-up page on application domain:** `/sign-up`
- ❌ Don't use Account Portal URL

**Signing Out:**
- ✅ **Path on application domain:** `/` (or `/sign-in`)
- ❌ Don't use Account Portal URL

## Why This Matters

Your React app has custom sign-in/sign-up pages at:
- `https://www.bluedrumai.com/sign-in` (uses `<SignIn />` component)
- `https://www.bluedrumai.com/sign-up` (uses `<SignUp />` component)

These are handled by your React Router, not Clerk's Account Portal.

## Current Setup in Your Code

Your `src/App.tsx` has:
```tsx
<Route path="/sign-in/*" element={<SignInPage />} />
<Route path="/sign-up/*" element={<SignUpPage />} />
```

So Clerk should redirect to:
- `/sign-in` (not `accounts.bluedrumai.com/sign-in`)
- `/sign-up` (not `accounts.bluedrumai.com/sign-up`)

## Steps to Fix

1. **In Clerk Dashboard → Settings → Paths:**
   - **<SignIn />:** Select "Sign-in page on application domain" and enter `/sign-in`
   - **<SignUp />:** Select "Sign-up page on application domain" and enter `/sign-up`
   - **Signing Out:** Select "Path on application domain" and enter `/` or `/sign-in`

2. **Verify Redirect URLs** (Settings → Domains):
   - `https://www.bluedrumai.com/onboarding`
   - `https://www.bluedrumai.com/sign-in`
   - `https://www.bluedrumai.com/sign-up`
   - `http://localhost:5173/onboarding` (for development)

3. **Restart your dev server** after making changes

## Account Portal vs Application Domain

- **Account Portal** (`accounts.bluedrumai.com`): Clerk's hosted pages (optional, for users who want Clerk's default UI)
- **Application Domain** (`www.bluedrumai.com/sign-in`): Your custom React pages (what you're using)

Since you have custom sign-in/sign-up pages, always use **Application Domain** paths.

