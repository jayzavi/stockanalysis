# Deploy the Stock Research app on Vercel

This gets you a **real website URL** (e.g. `stock-research-xyz.vercel.app`) so you can use the app in your browser without running anything on your computer.

---

## Step 1: Put your code on GitHub

Vercel deploys from GitHub (or similar). If the project isn’t in a repo yet:

1. Go to [github.com](https://github.com) and sign in.
2. Click **+** (top right) → **New repository**.
3. Name it (e.g. `stock-research-engine`), leave other options default, click **Create repository**.
4. In Cursor, open the terminal (Terminal → New Terminal).
5. In the terminal, run these commands **one at a time** (replace `YOUR_USERNAME` and `stock-research-engine` with your GitHub username and repo name):

   ```bash
   cd "/Users/J10/Cursor/Stock Analysis"
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/stock-research-engine.git
   git push -u origin main
   ```

   If Git asks you to log in, use your GitHub username and a **Personal Access Token** as the password (GitHub → Settings → Developer settings → Personal access tokens).

---

## Step 2: Create the project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use “Continue with GitHub” if you have the repo on GitHub).
2. Click **Add New…** → **Project**.
3. Under “Import Git Repository”, find **stock-research-engine** (or whatever you named it) and click **Import**.
4. Leave **Framework Preset** as Next.js and **Root Directory** empty.
5. Before clicking Deploy, open **Environment Variables** and add:

   | Name                 | Value                    |
   |----------------------|--------------------------|
   | `OPENROUTER_API_KEY` | your OpenRouter key      |
   | `TAVILY_API_KEY`     | your Tavily key          |
   | `USE_MOCK_AGENTS`    | `true`                   |

   Use **true** for `USE_MOCK_AGENTS` so the site works without long-running LLM calls while you test the UI. Later you can set it to **false** in Vercel for live memos.

6. Click **Deploy**. Wait a minute or two.

---

## Step 3: Open your site

When the deploy finishes, Vercel shows a link like **https://stock-research-engine-xxxx.vercel.app**. Click it (or “Visit”) to open your app.

- Enter a Research Ask and click **Generate memo**. With **USE_MOCK_AGENTS=true** you’ll get the mock memo right away.
- To use real LLM calls later: in Vercel go to your project → **Settings** → **Environment Variables**, change **USE_MOCK_AGENTS** to **false**, then **Redeploy** (Deployments → … on latest → Redeploy).

---

## Quick reference

| I want to…              | Do this… |
|-------------------------|----------|
| Use the app in a browser | Deploy to Vercel (steps above) and open the Vercel URL. |
| Test UI without APIs     | Set `USE_MOCK_AGENTS=true` in Vercel env vars (default in these steps). |
| Generate real memos     | Set `USE_MOCK_AGENTS=false` in Vercel and redeploy. (Live runs can be slow; Pro may be needed for long timeouts.) |

You don’t need to run a “dev server” on your computer; the Vercel URL is your website.
