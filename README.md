# Stock Research Engine

Multi-agent stock research app that produces **executive research memos** (≤2 pages) from a single "Research Ask" prompt. Three specialist agents run in parallel (with web search), then a Chairman model synthesizes a consensus Markdown memo.

## Stack

- **Next.js 14** (App Router), **Tailwind CSS**
- **OpenRouter** for LLM calls (Claude, GPT, Gemini)
- **Tavily** for web search used by each agent

## Deploy on Vercel (recommended — no “dev server” needed)

## Memo history (Google Drive)

Optional: **Sign in with Google** to save memos to your Google Drive. Memos are stored in a folder you choose (set `GOOGLE_DRIVE_MEMOS_FOLDER_ID` in Vercel). Only you can see or delete them. See **[GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md)** for OAuth and folder setup. No secrets go in the repo.

---

## Deploy on Vercel

**Want a real website URL?** Use the full walkthrough: **[SETUP_GITHUB_AND_VERCEL.md](./SETUP_GITHUB_AND_VERCEL.md)** — step-by-step instructions to put the project on GitHub, then deploy on Vercel (written for non-engineers). You’ll get a link like `https://your-app.vercel.app` to use in your browser.

---

## Local setup (optional)

1. Copy env and add keys:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local`:
   - `OPENROUTER_API_KEY` — from [OpenRouter](https://openrouter.ai/keys)
   - `TAVILY_API_KEY` — from [Tavily](https://app.tavily.com)

2. Optional model overrides (in `.env.local`):
   - `OPENROUTER_MODEL_ALPHA` — e.g. `anthropic/claude-opus-4.6`
   - `OPENROUTER_MODEL_BETA` — e.g. `openai/gpt-5.2`
   - `OPENROUTER_MODEL_GAMMA` — e.g. `google/gemini-3-pro`
   - `OPENROUTER_MODEL_CHAIRMAN` — e.g. `anthropic/claude-sonnet-4`

3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Flow

1. User enters a **Research Ask** (e.g. ticker, time frame, focus).
2. One **Tavily** search runs for that ask (time frame + technical/context).
3. **Agent Alpha** (Claude), **Agent Beta** (GPT), **Agent Gamma** (Gemini) run **in parallel**, each with the same search context. Each produces:
   - Data analysis aligned to the ask
   - Technical quant-style analysis (trend levels, stochastics, options volume, institutional flow)
   - JSON with citations and confidence.
4. **Chairman** model reads all three JSON reports and writes a single **Markdown executive memo** (consensus, key levels, risks, bottom line; ≤2 pages).
5. Frontend shows the memo rendered as Markdown.

## What I need from you

- **API keys**: `OPENROUTER_API_KEY` and `TAVILY_API_KEY` in `.env.local`.
- **Exact model IDs** (if you want specific models): set `OPENROUTER_MODEL_ALPHA`, `OPENROUTER_MODEL_BETA`, `OPENROUTER_MODEL_GAMMA` to the IDs from [OpenRouter Models](https://openrouter.ai/docs/models) (e.g. Claude Opus 4.6, GPT-5.2, Gemini 3 Pro when listed).
- **Vercel** (optional): for production, set the same env vars in the project settings and optionally `maxDuration` in `app/api/research/route.ts` to match your plan (e.g. 120s).

Once keys and (optionally) model IDs are set, you can run the app and generate memos from the Research Ask input.
