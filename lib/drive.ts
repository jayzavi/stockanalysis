import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const FOLDER_ID = process.env.GOOGLE_DRIVE_MEMOS_FOLDER_ID;
const MEMO_MIME = "application/json";
const DOC_MIME = "application/vnd.google-apps.document";

export type SavedMemo = {
  id: string;
  runId: string;
  researchAsk: string;
  memo: string;
  generatedAt: string;
  models: string;
  docId?: string;
};

/** Rough markdown to plain text so the Doc reads like a memo */
function markdownToPlainText(md: string): string {
  return md
    .replace(/^#{1,3}\s+/gm, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^-\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, (m) => m)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} at ${time}`;
}

async function getAccessToken(req: NextRequest): Promise<string | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? undefined,
  });
  return (token?.accessToken as string) ?? null;
}

async function driveFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `https://www.googleapis.com/drive/v3${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers as Record<string, string>),
    },
  });
}

async function docsFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `https://docs.googleapis.com/v1${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });
}

/** Create a Google Doc with memo content (readable in Drive) and return its file id */
async function createMemoDoc(
  accessToken: string,
  memo: Omit<SavedMemo, "id">,
  docName: string
): Promise<string | null> {
  const createRes = await driveFetch(accessToken, "https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: docName,
      mimeType: DOC_MIME,
      parents: FOLDER_ID ? [FOLDER_ID] : undefined,
    }),
  });
  if (!createRes.ok) {
    console.error("Drive create doc error", await createRes.text());
    return null;
  }
  const created = (await createRes.json()) as { id: string };
  const docId = created.id;

  const bodyText = [
    "Jay Money Insights",
    "",
    `Generated ${formatGeneratedAt(memo.generatedAt)} | Run ${memo.runId}`,
    `Models: ${memo.models}`,
    "",
    "——— Backdrop ———",
    "",
    memo.researchAsk,
    "",
    "——— Memo ———",
    "",
    markdownToPlainText(memo.memo),
  ].join("\n");

  const updateRes = await docsFetch(accessToken, `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{ insertText: { location: { index: 1 }, text: bodyText } }],
    }),
  });
  if (!updateRes.ok) {
    console.error("Docs batchUpdate error", await updateRes.text());
    return docId;
  }
  return docId;
}

export async function listMemos(req: NextRequest): Promise<SavedMemo[]> {
  const accessToken = await getAccessToken(req);
  if (!accessToken || !FOLDER_ID) return [];

  const q = `'${FOLDER_ID}' in parents and mimeType = '${MEMO_MIME}' and trashed = false`;
  const res = await driveFetch(
    accessToken,
    `/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&fields=files(id,name,createdTime)`
  );
  if (!res.ok) return [];

  const data = (await res.json()) as { files: { id: string; name: string; createdTime: string }[] };
  const memos: SavedMemo[] = [];

  for (const file of data.files ?? []) {
    const contentRes = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
    if (!contentRes.ok) continue;
    try {
      const memo = (await contentRes.json()) as SavedMemo;
      memo.id = file.id;
      memos.push(memo);
    } catch {
      // skip invalid JSON
    }
  }

  return memos;
}

export async function createMemo(req: NextRequest, memo: Omit<SavedMemo, "id">): Promise<{ id: string } | null> {
  const accessToken = await getAccessToken(req);
  if (!accessToken || !FOLDER_ID) return null;

  const docName = `Jay Money Insights – Run ${memo.runId} – ${formatGeneratedAt(memo.generatedAt).replace(/,/g, "")}`;
  const docId = await createMemoDoc(accessToken, memo, docName);

  const meta = { ...memo, docId: docId ?? undefined };
  const metadata = {
    name: `memo-${memo.runId}-${Date.now()}.json`,
    parents: [FOLDER_ID],
    mimeType: MEMO_MIME,
  };

  const boundary = "-------NextAuthDriveUpload";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${MEMO_MIME}\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}--`;

  const res = await driveFetch(accessToken, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    console.error("Drive create error", await res.text());
    return null;
  }
  const created = (await res.json()) as { id: string };
  return { id: created.id };
}

export async function deleteMemoById(req: NextRequest, fileId: string): Promise<boolean> {
  const accessToken = await getAccessToken(req);
  if (!accessToken) return false;

  const contentRes = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  if (contentRes.ok) {
    try {
      const meta = (await contentRes.json()) as { docId?: string };
      if (meta.docId) {
        await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${meta.docId}`, {
          method: "DELETE",
        });
      }
    } catch {
      // ignore
    }
  }

  const res = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
  });
  return res.ok || res.status === 204;
}

export async function deleteAllMemosInFolder(req: NextRequest): Promise<number> {
  const accessToken = await getAccessToken(req);
  if (!accessToken || !FOLDER_ID) return 0;

  const q = `'${FOLDER_ID}' in parents and mimeType = '${MEMO_MIME}' and trashed = false`;
  const listRes = await driveFetch(
    accessToken,
    `/files?q=${encodeURIComponent(q)}&fields=files(id)`
  );
  if (!listRes.ok) return 0;

  const data = (await listRes.json()) as { files: { id: string }[] };
  let deleted = 0;
  for (const file of data.files ?? []) {
    const contentRes = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
    if (contentRes.ok) {
      try {
        const meta = (await contentRes.json()) as { docId?: string };
        if (meta.docId) {
          await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${meta.docId}`, {
            method: "DELETE",
          });
        }
      } catch {
        // ignore
      }
    }
    const delRes = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${file.id}`, {
      method: "DELETE",
    });
    if (delRes.ok || delRes.status === 204) deleted++;
  }
  return deleted;
}
