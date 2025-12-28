# Screenshot Guide for Landing Page Feature Previews

## Overview
The landing page now includes a "Feature Previews" section that displays screenshots of the actual platform. This guide explains what screenshots to take and how to add them.

## Screenshot Requirements

### Image Specifications
- **Format:** PNG or JPG
- **Dimensions:** 1600x1200px (4:3 ratio) or 1920x1080px (16:9 ratio)
- **Quality:** High resolution, clear and readable text
- **File Size:** Optimize to under 500KB each
- **Location:** Place in `public/screenshots/` directory

## Required Screenshots

### 1. Dashboard (`dashboard.png`)
**What to capture:**
- Main dashboard view showing:
  - Readiness score card
  - Stats cards (Vault Entries, Risk Score, Chat Analyses, Readiness Score)
  - Recent Activity feed
  - Charts/graphs if visible

**How to take:**
1. Log into the dashboard
2. Make sure you have some sample data (or use demo data)
3. Take a full-page screenshot
4. Crop to show the main content area

**File:** `public/screenshots/dashboard.png`

---

### 2. Vault Timeline (`vault-timeline.png`)
**What to capture:**
- Consent Vault timeline view showing:
  - List of vault entries
  - Timeline layout
  - Entry cards with dates/types
  - Search/filter options visible

**How to take:**
1. Navigate to `/dashboard/vault/timeline`
2. Ensure you have at least 3-5 entries visible
3. Take a screenshot of the timeline view
4. Make sure dates and entry types are readable

**File:** `public/screenshots/vault-timeline.png`

---

### 3. Chat Analyzer (`chat-analyzer.png`)
**What to capture:**
- Red Flag Radar analysis results showing:
  - Risk score prominently displayed
  - Red flags list
  - Analysis summary
  - Recommendations section
  - Platform badge (WhatsApp/SMS/etc.)

**How to take:**
1. Navigate to `/dashboard/red-flag-radar`
2. Upload a sample chat or use existing analysis
3. Go to results page (`/dashboard/red-flag-radar/results/:id`)
4. Take screenshot showing the full analysis

**File:** `public/screenshots/chat-analyzer.png`

---

### 4. Income Tracker (`income-tracker.png`)
**What to capture:**
- Income Tracker history view showing:
  - List of monthly entries
  - Income/expense breakdown
  - Charts (if visible)
  - Summary cards

**How to take:**
1. Navigate to `/dashboard/income-tracker/history`
2. Ensure you have at least 2-3 months of data
3. Take screenshot showing the history view
4. Make sure numbers and dates are readable

**File:** `public/screenshots/income-tracker.png`

---

## Optional Additional Screenshots

### 5. Upload Evidence (`vault-upload.png`)
**What to capture:**
- Upload page showing:
  - Drag & drop area
  - File type options
  - Upload progress (if available)

**File:** `public/screenshots/vault-upload.png`

---

### 6. Analysis History (`analysis-history.png`)
**What to capture:**
- Chat analysis history page showing:
  - List of past analyses
  - Risk scores
  - Dates
  - Platform badges

**File:** `public/screenshots/analysis-history.png`

---

## How to Take Screenshots

### Method 1: Browser DevTools
1. Open Chrome/Firefox DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Set to "Desktop" or "Laptop" viewport
4. Use browser screenshot extension or:
   - Chrome: Use "Capture full size screenshot" in DevTools
   - Firefox: Use built-in screenshot tool

### Method 2: Browser Extensions
- **Chrome:** "Full Page Screen Capture" or "Awesome Screenshot"
- **Firefox:** "FireShot" or "Nimbus Screenshot"
- **Edge:** Built-in screenshot tool

### Method 3: OS Tools
- **Windows:** Snipping Tool or Snip & Sketch (Win+Shift+S)
- **Mac:** Cmd+Shift+4 (select area) or Cmd+Shift+3 (full screen)
- **Linux:** Use screenshot tool or `gnome-screenshot`

### Method 4: Professional Tools
- **CleanShot X** (Mac)
- **Lightshot** (Cross-platform)
- **Greenshot** (Windows)

---

## Image Optimization

### Before Uploading:
1. **Crop** unnecessary whitespace
2. **Resize** if needed (maintain aspect ratio)
3. **Compress** using:
   - [TinyPNG](https://tinypng.com/)
   - [Squoosh](https://squoosh.app/)
   - [ImageOptim](https://imageoptim.com/)

### Recommended Tools:
- **Online:** TinyPNG, Squoosh
- **Desktop:** ImageOptim, JPEGmini
- **CLI:** `sharp-cli` or `imagemagick`

---

## Adding Screenshots to the Project

### Step 1: Create Directory
```bash
mkdir -p public/screenshots
```

### Step 2: Add Images
Place your optimized screenshots in `public/screenshots/`:
```
public/
  screenshots/
    dashboard.png
    vault-timeline.png
    chat-analyzer.png
    income-tracker.png
```

### Step 3: Verify
The landing page will automatically load these images. If an image is missing, it will show a placeholder.

---

## Fallback Behavior

The code includes error handling:
- If an image fails to load, it shows a placeholder SVG
- This ensures the page still looks good even if screenshots aren't ready
- You can add screenshots incrementally

---

## Tips for Great Screenshots

### ✅ Do's:
- Use **real data** (or realistic demo data)
- Show **multiple entries** (not just one)
- Ensure **text is readable**
- Use **consistent styling** (same browser, same zoom level)
- **Hide sensitive data** (blur emails, names if needed)
- Show **key features** prominently

### ❌ Don'ts:
- Don't use **empty states** (show actual content)
- Don't include **personal information** (use demo data)
- Don't make images **too large** (optimize file size)
- Don't use **different browsers** (keep consistent)
- Don't show **error states** (only success states)

---

## Example Screenshot Checklist

Before taking screenshots, ensure:

- [ ] Dashboard has sample data
- [ ] Vault has at least 3-5 entries
- [ ] Chat analyzer has at least 1 completed analysis
- [ ] Income tracker has at least 2-3 months of data
- [ ] All text is readable
- [ ] No personal/sensitive data visible
- [ ] Consistent browser/zoom level
- [ ] Images are optimized (<500KB each)

---

## Quick Start

1. **Create directory:**
   ```bash
   mkdir -p public/screenshots
   ```

2. **Take screenshots** using your preferred method

3. **Optimize images** using TinyPNG or similar

4. **Place in directory:**
   ```
   public/screenshots/dashboard.png
   public/screenshots/vault-timeline.png
   public/screenshots/chat-analyzer.png
   public/screenshots/income-tracker.png
   ```

5. **Test locally:**
   - Start dev server: `npm run dev`
   - Visit landing page
   - Scroll to "Feature Previews" section
   - Verify images load correctly

---

## Troubleshooting

### Images not showing?
- Check file path: `public/screenshots/filename.png`
- Verify file exists in `public/` directory
- Check browser console for 404 errors
- Ensure file names match exactly (case-sensitive)

### Images too large?
- Use image optimization tools
- Compress to <500KB
- Consider WebP format for better compression

### Images look blurry?
- Use high-resolution screenshots (1600px+ width)
- Don't scale up small images
- Use PNG for text-heavy screenshots

---

## Next Steps

1. Take screenshots of all 4 main features
2. Optimize and add to `public/screenshots/`
3. Test on landing page
4. Consider adding more screenshots (upload, history, etc.)
5. Update screenshots as UI evolves

