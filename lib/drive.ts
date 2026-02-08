import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const FOLDER_ID = process.env.GOOGLE_DRIVE_MEMOS_FOLDER_ID;
const MEMO_MIME = "application/json";

export type SavedMemo = {
  id: string;
  runId: string;
  researchAsk: string;
  memo: string;
  generatedAt: string;
  models: string;
};

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

  const metadata = {
    name: `memo-${memo.runId}-${Date.now()}.json`,
    parents: [FOLDER_ID],
    mimeType: MEMO_MIME,
  };

  const boundary = "-------NextAuthDriveUpload";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${MEMO_MIME}\r\n\r\n${JSON.stringify(memo)}\r\n--${boundary}--`;

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
    const delRes = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${file.id}`, {
      method: "DELETE",
    });
    if (delRes.ok || delRes.status === 204) deleted++;
  }
  return deleted;
}
