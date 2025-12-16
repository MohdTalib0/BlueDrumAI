# Backend Setup Guide

## Option 1: Supabase (Recommended - Easiest)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### Step 2: Create Waitlist Table
Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  gender VARCHAR(50) NOT NULL,
  source VARCHAR(100) DEFAULT 'landing_page',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts
CREATE POLICY "Allow public inserts" ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);
```

### Step 3: Update Frontend
Update `src/components/SignupForm.tsx`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// In handleSubmit function, replace the API call with:
const { data, error } = await supabase
  .from('waitlist')
  .insert([{ email, gender, source: 'landing_page' }])

if (error) throw error
```

### Step 4: Add Environment Variables
Create `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Option 2: Express Backend

### Step 1: Create Backend Folder
```bash
mkdir backend
cd backend
npm init -y
npm install express cors dotenv
npm install -D @types/express @types/cors typescript tsx
```

### Step 2: Create Backend Files

**backend/src/server.ts:**
```typescript
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Simple in-memory storage (replace with database later)
const waitlist: Array<{ email: string; gender: string; timestamp: string }> = []

app.post('/api/waitlist', (req, res) => {
  const { email, gender } = req.body
  
  if (!email || !gender) {
    return res.status(400).json({ error: 'Email and gender required' })
  }

  // Check if email already exists
  if (waitlist.find(entry => entry.email === email)) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  waitlist.push({
    email,
    gender,
    timestamp: new Date().toISOString()
  })

  res.json({ success: true, message: 'Added to waitlist' })
})

app.get('/api/waitlist', (req, res) => {
  res.json({ count: waitlist.length, entries: waitlist })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### Step 3: Update Frontend
Update `src/components/SignupForm.tsx`:

```typescript
const response = await axios.post('http://localhost:3001/api/waitlist', {
  email,
  gender,
})
```

---

## Option 3: Serverless Function (Vercel/Netlify)

### Vercel Serverless Function

Create `api/waitlist.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, gender } = req.body

  // Here you can:
  // 1. Save to Supabase
  // 2. Send to email service (Resend, SendGrid)
  // 3. Save to Airtable
  // 4. Send to Google Sheets

  // Example: Send to Resend
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'onboarding@bluedrumai.com',
  //   to: 'your-email@example.com',
  //   subject: 'New Waitlist Signup',
  //   html: `<p>Email: ${email}, Gender: ${gender}</p>`
  // })

  res.json({ success: true })
}
```

---

## Option 4: Third-Party Services

### Resend (Email Service)
```bash
npm install resend
```

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'onboarding@bluedrumai.com',
  to: 'your-email@example.com',
  subject: 'New Waitlist Signup',
  html: `<p>Email: ${email}, Gender: ${gender}</p>`
})
```

### Airtable
```bash
npm install airtable
```

```typescript
import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID)

await base('Waitlist').create([
  {
    fields: {
      Email: email,
      Gender: gender,
      'Created At': new Date().toISOString()
    }
  }
])
```

---

## Quick Start (No Backend)

For immediate testing, the current implementation uses localStorage. You can:
1. Deploy the frontend as-is
2. Check browser console for signups
3. Set up backend later

To view signups stored in localStorage:
```javascript
// Run in browser console
JSON.parse(localStorage.getItem('waitlist') || '[]')
```

---

## Recommended: Supabase

Supabase is the easiest and most scalable option:
- Free tier: 500MB database, 1GB storage
- Built-in authentication (for later)
- Real-time capabilities
- Easy to scale

