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
    return NextResponse.json({
      memo,
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
