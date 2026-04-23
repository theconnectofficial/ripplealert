# ⚡ RippleAlert
### CVE Dependency Propagation Mapper — HackHelix 2026
**Runtime Hackers · IMS Engineering College**

---

## What It Does
Enter a CVE ID → RippleAlert traces the entire downstream dependency tree → visualizes a color-coded risk graph → Claude auto-drafts a GitHub patch-request issue for each affected maintainer.

---

## Setup (5 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API keys
```bash
cp .env.example .env
```
Open `.env` and fill in:
- **`VITE_GEMINI_API_KEY`** — get from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`** — optional, enables real GitHub login (see Auth Setup below)

### 3. Run the dev server
```bash
npm run dev
```

Open http://localhost:5173 and enter `CVE-2021-44228` to see the demo.

---

## Demo Strategy (Hackathon Day)

The app uses **pre-cached dependency data** for the traversal — no live npm/PyPI calls during the demo. This eliminates all network/rate-limit failure risk.

The **only live API call** is to Claude when you click "Draft Patch Issue" — this is intentional. It's the most impressive moment of the demo and is fast + reliable.

### Pre-loaded CVEs
- `CVE-2021-44228` — Log4Shell (the famous one — use this on stage)
- `CVE-2022-22965` — Spring4Shell

### To add more CVEs to the cache (run at home)
```bash
# Edit scripts/fetchAndCache.js and add CVE IDs to the cveToFetch array
npm run cache
```

---

## Tech Stack
- **React + Vite + react-router-dom** — Frontend & routing
- **Tailwind CSS** — Design tokens
- **D3.js** — Interactive dependency graph
- **Recharts** — Dashboard charts
- **Gemini API (gemini-2.0-flash)** — Patch issue generation
- **Supabase Auth** — GitHub OAuth (optional)
- **Pre-cached JSON** — Dependency data (no live API calls during demo)
- **Vercel** — Deployment

---

## Auth Setup (GitHub OAuth via Supabase)

> Skip this section to use the built-in **demo-user fallback** — RippleAlert works fully without Supabase configured.

1. **Create a free Supabase project** at [supabase.com](https://supabase.com).
2. In the Supabase dashboard go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
3. Open **Authentication → Providers → GitHub** and toggle it on.
4. Create a **GitHub OAuth App** at [github.com/settings/developers](https://github.com/settings/developers):
   - Homepage URL: `http://localhost:5173` (or your deploy URL)
   - **Authorization callback URL**: `<your-supabase-url>/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret** into the GitHub provider in Supabase.
6. Paste both Supabase values into `.env` and restart the dev server.

The login screen detects whether Supabase is configured. Without it, "Continue with GitHub" signs you in as a local demo user so the rest of the app remains usable.

---

## Routes
| Path     | Page                              |
|----------|-----------------------------------|
| `/`      | Marketing landing page            |
| `/login` | GitHub OAuth sign-in              |
| `/app`   | Main dashboard (auth-protected)   |

---

## Deployment (Vercel)
```bash
npm run build
# Drag the dist/ folder to vercel.com or use Vercel CLI
```
Add `VITE_CLAUDE_API_KEY` as an environment variable in Vercel dashboard.

---

## Project Structure
```
ripplealert/
├── src/
│   ├── components/
│   │   ├── DependencyGraph.jsx   ← D3 force graph
│   │   ├── ProjectCard.jsx       ← Affected project cards
│   │   └── IssueModal.jsx        ← Claude issue display
│   ├── data/
│   │   └── cve_cache.json        ← Pre-cached CVE + dependency data
│   ├── utils/
│   │   └── claudeApi.js          ← Claude API + severity helpers
│   ├── App.jsx                   ← Main application
│   └── main.jsx                  ← Entry point
├── scripts/
│   └── fetchAndCache.js          ← Run at home to cache new CVEs
├── .env.example                  ← Copy to .env and add API key
└── package.json
```
