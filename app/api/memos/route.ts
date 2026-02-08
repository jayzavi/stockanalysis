import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMemos, createMemo, deleteAllMemosInFolder } from "@/lib/drive";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const memos = await listMemos(req);
    return NextResponse.json({ memos });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list memos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { title, runId, researchAsk, memo, generatedAt, models } = body;
    if (!runId || !researchAsk || !memo || !generatedAt) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const created = await createMemo(req, {
      title: typeof title === "string" && title.trim() ? title.trim() : "Untitled memo",
      runId,
      researchAsk,
      memo,
      generatedAt,
      models: models ?? "",
    });
    if (!created) {
      return NextResponse.json({ error: "Failed to save memo" }, { status: 500 });
    }
    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save memo" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  if (searchParams.get("all") === "true") {
    const deleted = await deleteAllMemosInFolder(req);
    return NextResponse.json({ deleted });
  }
  return NextResponse.json({ error: "Use ?all=true to delete all" }, { status: 400 });
}
