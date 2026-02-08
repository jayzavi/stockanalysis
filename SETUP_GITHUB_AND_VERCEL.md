# Step-by-step: Put your app on GitHub, then on Vercel

Follow these steps in order. You’ll end up with a live website link you can open in your browser.

---

# Part 1: GitHub

GitHub is where we’ll store your project so Vercel can use it.

## 1.1 Create a GitHub account (if you don’t have one)

1. Open your browser and go to **https://github.com**.
2. Click **Sign up** (top right).
3. Enter your email, a password, and a username. Complete the sign-up (including any email verification).
4. You’re in when you see the GitHub home page.

---

## 1.2 Create a new repository (“repo”) on GitHub

1. On GitHub, click the **+** icon at the top right.
2. Click **New repository**.
3. You’ll see a form. Fill it like this:
   - **Repository name:** type `stock-research` (or any name you like, e.g. `stock-research-engine`). Remember this name; you’ll use it later.
   - **Description:** leave blank or type “Stock research memo app”.
   - **Public** should be selected (the dot next to “Public”).
   - **Do not** check “Add a README file”.
   - **Do not** add a .gitignore or a license.
4. Click the green **Create repository** button.
5. You’ll see a page that says “Quick setup” and shows a URL like `https://github.com/YOUR_USERNAME/stock-research.git`. **Leave this tab open** or copy that URL; you’ll need your GitHub username and repo name for the next part.

---

## 1.3 Install Git on your computer (if needed)

Git is the tool that uploads your code to GitHub.

1. Open **Terminal** on your Mac:
   - Press **Cmd + Space**, type **Terminal**, press Enter.
   - Or open **Finder** → **Applications** → **Utilities** → **Terminal**.
2. Type this and press Enter:
   ```bash
   git --version
   ```
3. If you see something like `git version 2.x.x`, Git is installed. Skip to **1.4**.
4. If you see “command not found” or an error:
   - Go to **https://git-scm.com/download/mac** and download and install Git for Mac, then close and reopen Terminal and try step 2 again.

---

## 1.4 Open the terminal in Cursor (in your project folder)

1. Open **Cursor** and open your project folder: **File** → **Open Folder** → choose **Stock Analysis** (the folder that contains `app`, `lib`, `package.json`, etc.).
2. In Cursor, open the terminal:
   - Menu: **Terminal** → **New Terminal**.
   - Or press **Ctrl + `** (backtick, the key above Tab).
3. A terminal panel should open at the bottom. The line might end with something like `Stock Analysis` or the path to your folder. That’s correct.

---

## 1.5 Run the Git commands (one at a time)

Copy and run **each** of the following commands **one at a time** in the Cursor terminal. After each line, press **Enter** and wait for it to finish before doing the next.

**Command 1 — Go into your project folder:**
```bash
cd "/Users/J10/Cursor/Stock Analysis"
```

**Command 2 — Tell Git this folder is a project:**
```bash
git init
```
You might see something like “Initialized empty Git repository”. That’s good.

**Command 3 — Stage all files:**
```bash
git add .
```
Nothing might appear; that’s normal.

**Command 4 — Save a first “snapshot” (commit):**
```bash
git commit -m "Initial commit"
```
You might see a list of files created. That’s good.

**Command 5 — Name the main branch:**
```bash
git branch -M main
```
Usually no output. That’s fine.

**Command 6 — Connect this folder to your GitHub repo:**

You must replace two things in the next line:
- Replace **YOUR_GITHUB_USERNAME** with your actual GitHub username (from the GitHub URL you saw in 1.2, e.g. if the URL was `https://github.com/jane-doe/stock-research`, your username is `jane-doe`).
- Replace **stock-research** with the exact repository name you typed in 1.2 (e.g. `stock-research` or `stock-research-engine`).

Then run the command:
```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/stock-research.git
```
Example: if your username is `jane-doe` and repo name is `stock-research`, the line would be:
```bash
git remote add origin https://github.com/jane-doe/stock-research.git
```

**Command 7 — Upload to GitHub:**
```bash
git push -u origin main
```

---

## 1.6 If Git asks for your username and password

- **Username:** your GitHub username.
- **Password:** GitHub no longer accepts your normal account password here. You must use a **Personal Access Token**.

**Create a token:**

1. On GitHub, click your **profile picture** (top right) → **Settings**.
2. In the left sidebar, scroll down and click **Developer settings**.
3. Click **Personal access tokens** → **Tokens (classic)**.
4. Click **Generate new token** → **Generate new token (classic)**.
5. Give it a name (e.g. “Vercel deploy”), choose an expiration (e.g. 90 days), and under **Scopes** check **repo**.
6. Click **Generate token**. **Copy the token immediately** (you won’t see it again).
7. Back in the terminal, when Git asks for a password, **paste this token** (don’t type your GitHub password).

If the terminal doesn’t ask for anything and the last command finishes with something like “branch 'main' set up to track 'origin/main'”, the push worked. Go to GitHub and refresh your repo page; you should see all your project files.

---

## 1.7 If something goes wrong

- **“git: command not found”** → Install Git (see 1.3).
- **“Permission denied” or “Authentication failed”** → Use a Personal Access Token as the password (see 1.6).
- **“remote origin already exists”** → You already ran the `git remote add` step; you can skip to the next command or run: `git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/stock-research.git` (with your username and repo name), then try `git push -u origin main` again.

When your code is on GitHub (you see files like `app`, `lib`, `package.json` on the repo page), you’re done with Part 1. Go to Part 2.

---

# Part 2: Vercel

Vercel will turn your GitHub project into a live website and give you a link.

## 2.1 Log in to Vercel with GitHub

1. Open your browser and go to **https://vercel.com**.
2. Click **Sign Up** or **Log In**.
3. Choose **Continue with GitHub**.
4. If asked, authorize Vercel to access your GitHub account (click **Authorize** or **Install**). This lets Vercel see your repos and deploy them.

---

## 2.2 Create a new project from your GitHub repo

1. On the Vercel dashboard, click **Add New…** (or **New Project**).
2. You’ll see “Import Git Repository”. Under **GitHub**, you should see a list of your repositories.
3. Find **stock-research** (or whatever you named the repo in Part 1) and click **Import** next to it.
4. If you don’t see it, click **Adjust GitHub App Permissions** and make sure Vercel can access that repository, then come back and try again.

---

## 2.3 Configure the project (leave most defaults)

1. **Project Name:** You can leave the default (e.g. `stock-research`) or type a different name. This will be part of your URL.
2. **Framework Preset:** Should say **Next.js**. Leave it.
3. **Root Directory:** Leave **empty** (don’t change it).
4. **Build and Output Settings:** Leave as they are.

---

## 2.4 Add Environment Variables (important)

These are your API keys and the “mock mode” flag. Vercel needs them so the app can run.

1. On the same page, find the section **Environment Variables**.
2. For each row below, type the **Name** exactly, then the **Value**, then click **Add** (or the equivalent button):

   **First variable:**
   - **Name:** `OPENROUTER_API_KEY`  
   - **Value:** paste your OpenRouter API key (the one you put in `.env.local`).  
   - Click **Add**.

   **Second variable:**
   - **Name:** `TAVILY_API_KEY`  
   - **Value:** paste your Tavily API key (from `.env.local`).  
   - Click **Add**.

   **Third variable:**
   - **Name:** `USE_MOCK_AGENTS`  
   - **Value:** `true`  
   - Click **Add**.

3. Leave **Environment** as **Production** (or all of Production / Preview / Development if you prefer).  
4. Double-check: you should see three variables listed: `OPENROUTER_API_KEY`, `TAVILY_API_KEY`, `USE_MOCK_AGENTS`.

---

## 2.5 Deploy

1. Click the **Deploy** button (usually at the bottom of the page).
2. Wait 1–2 minutes. You’ll see a log of “Building” and “Deploying”.
3. When it finishes, you’ll see **Congratulations!** (or similar) and a link like:
   **https://stock-research-xxxx.vercel.app**
4. Click **Visit** (or open that link in your browser). That’s your live website.

---

## 2.6 Use your site

1. You should see the Stock Research Engine page with a **Research Ask** box.
2. Type something in the box (e.g. “NVDA technical view for next quarter”).
3. Click **Generate memo**.
4. With `USE_MOCK_AGENTS=true`, a sample memo appears after a short delay. No real API calls are made; this is for testing the UI.

---

## 2.7 Later: switch to real AI memos

When you want the app to call the real AI and search the web:

1. In Vercel, open your project (click the project name on the dashboard).
2. Go to **Settings** → **Environment Variables**.
3. Find **USE_MOCK_AGENTS** and change its value from `true` to `false`. Save.
4. Go to **Deployments**, click the **…** on the latest deployment, and choose **Redeploy**. After it finishes, your site will use the live APIs.

---

## Quick checklist

**GitHub (Part 1)**  
- [ ] Created a GitHub repo (e.g. `stock-research`).  
- [ ] Ran the 7 Git commands in Cursor’s terminal (with your username and repo name in the 6th command).  
- [ ] Used a Personal Access Token if Git asked for a password.  
- [ ] Refreshed the repo on GitHub and see your project files.

**Vercel (Part 2)**  
- [ ] Logged in to Vercel with GitHub.  
- [ ] Imported the `stock-research` (or your repo) project.  
- [ ] Added `OPENROUTER_API_KEY`, `TAVILY_API_KEY`, and `USE_MOCK_AGENTS` = `true`.  
- [ ] Clicked Deploy and got a **Visit** link.  
- [ ] Opened the link and tested “Generate memo”.

If you get stuck on a specific step, note the step number and the exact message you see (or a screenshot), and you can share that for targeted help.
