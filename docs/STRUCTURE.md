# Repository Structure - Blue Drum AI

## Overview

This document describes the organized structure of the Blue Drum AI repository after cleanup and reorganization.

## Directory Structure

```
Project-AlimonyAI/
├── backend/                    # Express + TypeScript API
│   ├── src/
│   │   ├── middleware/         # Auth, logging, error handling
│   │   │   ├── auth.ts
│   │   │   ├── auditLogger.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── requestId.ts
│   │   │   └── sessionTracker.ts
│   │   ├── routes/             # API route handlers
│   │   │   ├── auth.ts
│   │   │   ├── health.ts
│   │   │   └── vault.ts
│   │   ├── services/           # Business logic
│   │   │   ├── ai.ts
│   │   │   ├── analytics.ts
│   │   │   └── storage.ts
│   │   ├── utils/              # Utilities
│   │   │   ├── metadataExtractor.ts
│   │   │   └── sanitize.ts
│   │   ├── supabase.ts         # Supabase client
│   │   └── server.ts           # Express app entry point
│   ├── dist/                   # Compiled JS (gitignored)
│   ├── ENV.sample.txt          # Environment template
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── src/                        # React + TypeScript Frontend
│   ├── components/
│   │   ├── auth/
│   │   │   └── EmailVerificationBanner.tsx
│   │   ├── vault/
│   │   │   └── FileUploader.tsx
│   │   ├── LandingPage.tsx
│   │   ├── RiskCalculator.tsx
│   │   └── SignupForm.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── SignIn.tsx
│   │   │   └── SignUp.tsx
│   │   ├── dashboard/
│   │   │   └── consent-vault/
│   │   │       ├── TimelineView.tsx
│   │   │       └── VaultUpload.tsx
│   │   ├── Dashboard.tsx
│   │   └── Onboarding.tsx
│   ├── lib/
│   │   └── clerk.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
│
├── supabase/
│   └── migrations/             # Database migrations (run in order)
│       ├── 000_legacy_tables.sql    # Waitlist & risk_checks
│       ├── 001_initial_schema.sql   # Core tables
│       ├── 002_rls_policies.sql     # RLS policies (optional)
│       ├── 003_storage_setup.sql    # Storage policies (optional)
│       └── 004_audit_logs.sql       # Logging & analytics tables
│
├── docs/                       # Documentation
│   ├── API.md                  # API reference
│   ├── ARCHITECTURE.md         # System architecture
│   ├── DATABASE.md             # Database schema
│   ├── MIGRATIONS.md           # Migration guide
│   ├── SETUP.md                # Setup instructions
│   ├── STRUCTURE.md            # This file
│   └── README.md               # Docs index
│
├── public/                     # Static assets
│   ├── drum.svg
│   ├── logo.svg
│   ├── robots.txt
│   └── sitemap.xml
│
├── .gitignore                  # Git ignore rules
├── CONTRIBUTING.md             # Contribution guidelines
├── README.md                   # Main project README
├── render.yaml                 # Render deployment config
├── package.json                # Frontend dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS config
├── postcss.config.js           # PostCSS config
├── tsconfig.json               # TypeScript config
└── tsconfig.node.json          # Node TypeScript config
```

## Key Files

### Configuration Files
- `package.json` - Frontend dependencies and scripts
- `backend/package.json` - Backend dependencies and scripts
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS theme and utilities
- `tsconfig.json` - TypeScript compiler options
- `render.yaml` - Render.com deployment blueprint

### Documentation
- `README.md` - Main project overview
- `docs/` - All detailed documentation
- `CONTRIBUTING.md` - Development guidelines
- `backend/README.md` - Backend-specific docs

### Environment
- `backend/ENV.sample.txt` - Backend environment template
- `.env` files are gitignored (never commit secrets)

## Cleanup Summary

### Deleted Files (13 unnecessary docs)
- `AUTH_PAGES_VS_MODALS.md`
- `AUTH_SETUP_VERIFICATION.md`
- `PHASE1_2_AUTH_COMPLETE.md`
- `PHASE1_1_PRODUCTION_CHECKLIST.md`
- `PRODUCTION_DATA_COLLECTION.md`
- `INTEGRATION_VERIFICATION.md`
- `PHASE1_1_COMPLETE.md`
- `USER_DATA_FLOW.md`
- `SETUP_SUMMARY.md`
- `PHASE1_SETUP.md`
- `CLAUDE_SETUP.md`
- `SECURITY_FIXES.md`
- `WAITLIST_BEHAVIOR_ANALYSIS.md`
- `RISK_CHECK_IMPLEMENTATION.md`
- `QUICK_START.md`

### Consolidated Files
- Legacy SQL files consolidated into `supabase/migrations/000_legacy_tables.sql`
- All documentation organized in `docs/` folder

### New Files Created
- `docs/` folder with organized documentation
- `docs/MIGRATIONS.md` - Migration guide
- `docs/STRUCTURE.md` - This file
- `CONTRIBUTING.md` - Contribution guidelines
- `supabase/migrations/000_legacy_tables.sql` - Consolidated legacy tables

## Best Practices

1. **Documentation**: Keep all docs in `docs/` folder
2. **Migrations**: Number migrations sequentially (000, 001, 002...)
3. **Code**: Follow TypeScript strict mode
4. **Environment**: Never commit `.env` files
5. **Git**: Use descriptive commit messages

## Next Steps

- Continue building features according to the development plan
- Keep documentation updated as features are added
- Maintain clean commit history

