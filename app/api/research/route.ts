import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runResearchPipelineOrMock } from "@/lib/agents";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const researchAsk = typeof body?.research_ask === "string" ? body.research_ask.trim() : null;
    if (!researchAsk) {
      return NextResponse.json(
        { error: "Missing or invalid research_ask" },
        { status: 400 }
      );
    }
    const { memo, specialistOutputs } = await runResearchPipelineOrMock(researchAsk);
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
