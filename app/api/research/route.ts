import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runResearchPipelineOrMock } from "@/lib/agents";
import { extractFromFiles } from "@/lib/extract-attachments";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    let researchAsk: string | null = null;
    let attachments: { name: string; content: string }[] = [];

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      researchAsk = (formData.get("research_ask") as string)?.trim() ?? null;
      const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);
      if (files.length > 0) {
        attachments = await extractFromFiles(files);
      }
    } else {
      const body = await request.json();
      researchAsk = typeof body?.research_ask === "string" ? body.research_ask.trim() : null;
      if (Array.isArray(body?.attachments)) {
        attachments = body.attachments.filter(
          (a: unknown): a is { name: string; content: string } =>
            typeof a === "object" && a !== null && "name" in a && "content" in a
        );
      }
    }

    if (!researchAsk) {
      return NextResponse.json(
        { error: "Missing or invalid research_ask" },
        { status: 400 }
      );
    }

    const { memo, specialistOutputs } = await runResearchPipelineOrMock(researchAsk, attachments);
    attachments.length = 0;
    const generatedAt = new Date().toISOString();
    const runId = randomBytes(4).toString("hex");
    return NextResponse.json({
      memo,
      researchAsk,
      generatedAt,
      runId,
      models: "gpt-4o / claude-opus-4 / gemini-2.0-flash",
      specialistOutputs: specialistOutputs.map((o) => ({
        name: o.name,
        parsed: o.parsed,
        rawExcerpt: o.raw.slice(0, 500),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research pipeline failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
