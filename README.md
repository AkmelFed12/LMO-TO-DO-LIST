<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1fuhuCEC5z1P0ksAS5gI2g61Plb-8loGR

## Run Locally (Vercel-style)

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. If you want to bypass the API locally, set `VITE_API_BASE=` (empty) in `.env.local` to use LocalStorage.
3. Run the app:
   `npm run dev`

## Deploy on Vercel (Frontend + API)

This project includes a Vercel Function at `api/index.js` and SPA rewrites in `vercel.json`.

### 1) Create a Postgres database (Neon recommended)
- Create a Neon project and copy the connection string.
- Set it in Vercel as `DATABASE_URL`.

### 2) Environment variables on Vercel
Set the following in your Vercel project:
- `DATABASE_URL` (required)
- `GEMINI_API_KEY` (optional, for AI generation)

### 3) Deploy
- Import your Git repo in Vercel
- Build Command: `npm run build`
- Output Directory: `dist`
