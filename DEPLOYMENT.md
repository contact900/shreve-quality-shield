# Shreve Quality Shield — Deployment Guide

## Overview

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | React + Vite hosted on Vercel | **Free** |
| Database | Google Sheets | **Free** |
| Backend / Email | Google Apps Script Web App | **Free** |
| Photo Storage | Google Drive | **Free** |

---

## STEP 1 — Set Up Google Sheets + Drive

1. Go to [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**
2. Name it: **Shreve Quality Shield**
3. Copy the **Spreadsheet ID** from the URL bar:
   ```
   https://docs.google.com/spreadsheets/d/  ← YOUR_SPREADSHEET_ID → /edit
   ```
4. Go to [drive.google.com](https://drive.google.com) → **New → Folder**
5. Name it: **Shreve QC Evidence Photos**
6. Open that folder, copy the **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/  ← YOUR_FOLDER_ID
   ```

---

## STEP 2 — Deploy Google Apps Script (Backend)

### A. Create the Script
1. Open your **Shreve Quality Shield** spreadsheet
2. Click **Extensions → Apps Script**
3. Delete all existing code in `Code.gs`
4. Open `apps-script.js` from this project (in your QC APP folder)
5. Paste the entire contents into `Code.gs`

### B. Configure the Script
At the top of `Code.gs`, fill in your values:
```javascript
var DRIVE_FOLDER_ID = 'YOUR_FOLDER_ID'   // ← from Step 1.6
var OWNER_EMAIL     = 'contact@shrevecleaning.com'  // ← already set
```

> ⚠️ The `SPREADSHEET_ID` is **not needed** when the script is bound to the sheet via Extensions → Apps Script — it uses `SpreadsheetApp.getActiveSpreadsheet()` automatically.

### C. Deploy as a Web App
1. Click **Deploy → New Deployment**
2. Click the gear icon next to "Select type" → choose **Web app**
3. Set:
   - **Description**: `Shreve QC v2`
   - **Execute as**: `Me (your Google account)`
   - **Who has access**: `Anyone`
4. Click **Deploy**
5. Click **Authorize access** → Choose your Google account → Allow all permissions
6. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
   **Keep this URL — you'll need it in Step 3.**

### D. Verify the Script is Live
Paste the Web App URL directly into your browser. You should see:
```
Shreve Quality Shield v2 API is live.
```

---

## STEP 3 — Set Up Local Environment

In your `QC APP` project folder, create a `.env` file:
```bash
# In your terminal (from the QC APP folder):
echo "VITE_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec" > .env
```

Or create the file manually and add:
```
VITE_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Replace the URL with the one you copied in Step 2C.

Test locally:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) on your phone or browser.

---

## STEP 4 — Deploy Frontend to Vercel (Free)

### A. Push to GitHub
```bash
# From your QC APP folder:
git init
git add .
git commit -m "Initial Shreve Quality Shield v2"
```

Go to [github.com](https://github.com) → **New repository** → name it `shreve-quality-shield` → Create.

```bash
git remote add origin https://github.com/YOUR_USERNAME/shreve-quality-shield.git
git branch -M main
git push -u origin main
```

### B. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → **Sign up** with your GitHub account (free)
2. Click **Add New → Project**
3. Import your `shreve-quality-shield` repository
4. Vercel will auto-detect Vite — settings should be:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Environment Variables** (before deploying):
   - Key: `VITE_WEBHOOK_URL`
   - Value: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`
   - Click **Add**
6. Click **Deploy**

After ~60 seconds, you'll get a live URL like:
```
https://shreve-quality-shield.vercel.app
```

**Open that URL on Stacey's iPhone — it's ready to use! 📱**

### C. Custom Domain (Optional)
In Vercel project → **Settings → Domains** → add a custom domain (e.g., `qc.shrevecleaning.com`) for free.

---

## STEP 5 — Future Updates

When you make changes to the React app:
```bash
git add .
git commit -m "Update: [describe change]"
git push
```
Vercel auto-deploys within ~60 seconds. No action needed.

When you make changes to the Apps Script:
1. Edit `Code.gs` in script.google.com
2. Click **Deploy → Manage Deployments**
3. Click the pencil/edit icon on your existing deployment
4. Change version to "New version"
5. Click **Deploy** — **same URL is preserved**

---

## STEP 6 — Grant Google Sheets/Drive Re-authorization (If Needed)

If the script stops working after 30 days, re-run authorization:
1. Open Apps Script
2. Click any function → Run
3. Follow authorization prompts again

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Submissions appear to succeed but nothing in Sheet | Check Webhook URL in `.env` and Vercel env vars |
| "Webhook URL not configured" error | Set `VITE_WEBHOOK_URL` in `.env` for local, or Vercel env vars for production |
| Photos not appearing in Drive | Check `DRIVE_FOLDER_ID` is correct in `Code.gs` |
| Email not sending | Check GAS authorization — re-run and re-authorize |
| QR scanner won't open camera | HTTPS is required — works on Vercel, not plain `http://` |
| Script changes don't take effect | Did you edit the **existing** deployment, not create a new one? |

---

## App Tab Guide

| Tab | Purpose |
|-----|---------|
| 🛡️ Inspection | 8-point scorecard + per-item photos + inventory section |
| 🔍 Equipment | QR scanner → log asset condition to Assets sheet |
| 📦 Inventory | Standalone stock-take → RED ALERT email if below threshold |

### Photo Requirement
Every inspection submission requires **one photo per area** (8 total). The submit button stays locked until all 8 photos are captured. This ensures every report has visual evidence.

### RED ALERT Logic
| Supply Item | Minimum Threshold |
|------------|------------------|
| Multi-Surface Cleaner | 5 bottles |
| Paper Towels | 10 rolls |
| Liners | 20 boxes |
| Disinfectant | 3 bottles |

When any item is below its minimum, the email subject line is prefixed with 🚨 and a red alert table appears **at the top** of the email body.
