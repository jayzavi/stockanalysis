# Google Sign-In + Drive memo history (optional)

Memo history is stored in **your** Google Drive. Only you can see it after signing in. No secrets are stored in the repo.

---

## Reusing your existing Google setup (e.g. Jay Trader)

If you already have a Google Cloud project and OAuth 2.0 credentials from another app (like Jay Trader), use the **same** Client ID and Client Secret here. You only need to:

1. **Add this app’s redirect URI** to the same OAuth client:
   - [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → open your **OAuth 2.0 Client ID** (the one used for Jay Trader).
   - Under **Authorized redirect URIs**, click **Add URI** and add:
     - **This app (production):** `https://YOUR_STOCK_APP_VERCEL_URL/api/auth/callback/google`  
       (e.g. `https://stockanalysis-xxx.vercel.app/api/auth/callback/google`)
     - **Local (optional):** `http://localhost:3000/api/auth/callback/google`
   - Save.

2. **Enable Google Drive API** for that same project (if not already):
   - **APIs & Services** → **Library** → search **Google Drive API** → **Enable**.

3. **Use the same credentials in this app’s env:**
   - In **Vercel** → this project (Jay Money Insights / Stock Analysis) → **Settings** → **Environment Variables**, set:
     - `GOOGLE_CLIENT_ID` = same as Jay Trader
     - `GOOGLE_CLIENT_SECRET` = same as Jay Trader
     - `NEXTAUTH_SECRET` = a new random string for this app (e.g. `openssl rand -base64 32`)
     - `NEXTAUTH_URL` = **this** app’s URL (e.g. `https://stockanalysis-xxx.vercel.app`)
     - `GOOGLE_DRIVE_MEMOS_FOLDER_ID` = your Drive folder ID for memo history (e.g. `1rCLS22CgYULZ9Z5wSv2L6hJOz1gTk9-y`)

That’s it. No new OAuth client or new project needed.

---

## 1. Create a Google Cloud project and OAuth credentials (if starting from scratch)

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project or select one.
3. **APIs & Services** → **Library** → search **Google Drive API** → **Enable**.
4. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
5. If prompted, configure the OAuth consent screen (External, add your email as test user).
6. Application type: **Web application**.
7. **Authorized redirect URIs**: add:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://YOUR_VERCEL_DOMAIN/api/auth/callback/google` (e.g. `https://stockanalysis-xxx.vercel.app/api/auth/callback/google`)
8. Create → copy **Client ID** and **Client secret**.

## 2. Drive folder for memos

Use the folder you want memos saved to (e.g. the one you shared: the ID is in the URL  
`https://drive.google.com/drive/folders/1rCLS22CgYULZ9Z5wSv2L6hJOz1gTk9-y` → folder ID is `1rCLS22CgYULZ9Z5wSv2L6hJOz1gTk9-y`).  
Only the signed-in user (you) can read/write; the app only uses your OAuth token.

## 3. Environment variables (Vercel only)

In **Vercel** → your project → **Settings** → **Environment Variables**, add:

| Name | Value |
|------|--------|
| `NEXTAUTH_SECRET` | A random string (e.g. `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your live URL, e.g. `https://stockanalysis-xxx.vercel.app` |
| `GOOGLE_CLIENT_ID` | From step 1 |
| `GOOGLE_CLIENT_SECRET` | From step 1 |
| `GOOGLE_DRIVE_MEMOS_FOLDER_ID` | Folder ID from step 2 (e.g. `1rCLS22CgYULZ9Z5wSv2L6hJOz1gTk9-y`) |

Do **not** put these in the repo. The repo stays public; secrets live only in Vercel (or local `.env.local`).

## 4. Security

- Only you can access the Drive folder; the app uses your Google account after you click “Sign in with Google”.
- Deleting a memo in the app deletes the file in Drive. “Delete all” removes all memo files from that folder.
