# Quick Start Guide

## 🚀 Get Your Landing Page Live in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to see your landing page!

### Step 3: Test the Signup Form
1. Click "Join Waitlist"
2. Enter an email
3. Select a module (Men's/Women's/Both)
4. Submit

Currently, signups are stored in browser localStorage (for testing).

### Step 4: Set Up Backend (Choose One)

**Option A: Supabase (Recommended - 5 minutes)**
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Run SQL from `BACKEND_SETUP.md`
4. Add environment variables to `.env`:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```
5. Update `SignupForm.tsx` to use Supabase (see `BACKEND_SETUP.md`)

**Option B: Deploy Without Backend (For Now)**
- The page works with localStorage
- You can collect emails manually from browser console
- Set up backend later

### Step 5: Deploy to Production

**Vercel (Easiest):**
```bash
npm install -g vercel
vercel
```

**Netlify:**
1. Build: `npm run build`
2. Drag `dist` folder to [netlify.com](https://netlify.com)

**GitHub Pages:**
1. Build: `npm run build`
2. Deploy `dist` folder to GitHub Pages

---

## 📝 Customization

### Change Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  primary: {
    // Change these colors
    600: '#2563eb', // Main blue
  }
}
```

### Change Content
- Hero text: `src/components/LandingPage.tsx` (line ~30)
- Features: `src/components/LandingPage.tsx` (line ~80)
- Footer: `src/components/LandingPage.tsx` (line ~180)

### Add Analytics
Add to `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
```

---

## 🎯 Next Steps

1. **Set up email collection** (Supabase recommended)
2. **Add your domain** (point DNS to hosting)
3. **Share the link** on Twitter, Reddit, WhatsApp groups
4. **Track signups** and iterate based on feedback

---

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Kill process on port 5173
npx kill-port 5173
```

**Build errors?**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Styling issues?**
- Make sure Tailwind is configured correctly
- Check `postcss.config.js` exists
- Restart dev server

---

## 📞 Need Help?

Check `BACKEND_SETUP.md` for backend integration options.

