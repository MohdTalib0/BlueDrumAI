# Blue Drum AI Backend (Waitlist API)

Minimal Express + TypeScript API to store waitlist signups in Supabase using the **service role key**.

## 1) Create the Supabase table

Run the SQL in `supabase/waitlist.sql` inside Supabase SQL editor.

## 2) Configure environment variables

Copy `backend/ENV.sample.txt` to `backend/.env` and fill values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL` (for CORS)
- `PORT` (default 3001)

## 3) Install + run locally

```bash
cd backend
npm install
npm run dev
```

Health check: `GET /health`  \nSignup endpoint: `POST /api/waitlist`

## 4) Frontend config

Set in the frontend `.env`:

```
VITE_API_BASE_URL=http://localhost:3001
```


