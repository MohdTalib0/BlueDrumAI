# Blue Drum AI - Landing Page

Early signup landing page for Blue Drum AI - Your Legal Vigilance Partner.

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

Currently, signups are stored in localStorage. To connect to a real backend:

1. **Option 1: Supabase** (Recommended)
   - Create a `waitlist` table in Supabase
   - Update `SignupForm.tsx` to use Supabase client
   - Add your Supabase URL and anon key

2. **Option 2: Express Backend**
   - Create an endpoint: `POST /api/waitlist`
   - Update the API call in `SignupForm.tsx`
   - Add your backend URL to environment variables

3. **Option 3: Third-party Service**
   - Use services like ConvertKit, Mailchimp, or Resend
   - Update the API call accordingly

## Environment Variables

Create a `.env` file (optional for now):

```env
VITE_API_URL=your_backend_url
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Deploy

### Netlify
1. Build: `npm run build`
2. Deploy `dist` folder to Netlify

### Other Platforms
- Build the project: `npm run build`
- Deploy the `dist` folder to any static hosting service

## Next Steps

1. Set up backend/Supabase for email collection
2. Add analytics (Google Analytics, PostHog)
3. Add social media links
4. Customize colors/branding
5. Add more content sections

## License

Private - All rights reserved

