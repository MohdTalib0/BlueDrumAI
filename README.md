# Blue Drum AI - Landing Page

Early signup landing page for Blue Drum AI - Your Legal Vigilance Partner.

## Deploy to Render (frontend + backend)

This repo includes:
- **Frontend**: Vite static site (this folder)
- **Backend**: Express API in `backend/`

### 1) Create Supabase waitlist table

Run `supabase/waitlist.sql` in Supabase SQL Editor.

### 2) Deploy using Render Blueprint

1. Push this repo to GitHub.
2. In Render: **New > Blueprint** and select this repo (Render will read `render.yaml`).
3. After services are created, set Render environment variables:
   - **Backend (`bluedrumai-api`)**:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` (secret)
   - **Frontend (`bluedrumai-web`)**:
     - `VITE_API_BASE_URL` = your backend URL (example: `https://bluedrumai-api.onrender.com`)
4. Trigger a redeploy of the frontend after setting `VITE_API_BASE_URL` (it is injected at build time).

### 3) Keep the Render backend alive (free tier)

This repo includes a GitHub Action scheduled ping:
- Workflow: `.github/workflows/keepalive.yml`
- It calls your backend `/health` and `/health/db` endpoints every 10 minutes.
  - `/health/db` performs a tiny Supabase query so your Supabase project stays active on free tier.

Add a GitHub repo secret:
- `RENDER_HEALTH_URL` = `https://YOUR_BACKEND.onrender.com/health`

## Features

- Modern, responsive design
- Email waitlist signup
- Gender-specific module selection
- Mobile-friendly
- Ready to deploy

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Backend Integration
This project now uses the included **Express backend** in `backend/` to write waitlist signups into Supabase.

## Environment Variables
Frontend:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Backend: see `backend/ENV.sample.txt` (create `backend/.env` locally; do not commit).

## Deployment
Use Render Blueprint (recommended) — see **Deploy to Render** section above.

## Next Steps

1. Set up backend/Supabase for email collection
2. Add analytics (Google Analytics, PostHog)
3. Add social media links
4. Customize colors/branding
5. Add more content sections

## License

Private - All rights reserved

