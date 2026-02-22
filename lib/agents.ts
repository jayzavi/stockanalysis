import { chat } from "./openrouter";
import { webSearchMulti, type SearchResult } from "./tavily";

export const MODELS = {
  alpha: process.env.OPENROUTER_MODEL_ALPHA ?? "anthropic/claude-sonnet-4",
  beta: process.env.OPENROUTER_MODEL_BETA ?? "openai/gpt-4o",
  gamma: process.env.OPENROUTER_MODEL_GAMMA ?? "google/gemini-2.0-flash-001",
  chairman: process.env.OPENROUTER_MODEL_CHAIRMAN ?? "google/gemini-2.0-flash-001",
} as const;

export type SpecialistOutput = {
  data_analysis: string;
  key_assumptions_and_confidence?: string;
  technical_analysis: {
    trend_levels: string;
    stochastic_indicators: string;
    options_volume: string;
    institutional_flow: string;
    summary_view: string;
  };
  citations: { title: string; url: string }[];
  confidence_score: number;
};

function formatSearchContext(results: SearchResult[]): string {
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
    )
    .join("\n\n---\n\n");
}

const SPECIALIST_SYSTEM = `You are a senior analyst at a top-tier technology-focused hedge fund with 15 years of experience evaluating sector investments. Your deep expertise is in the sector(s) and companies referenced in the research ask. Your job is to produce a rigorous, opinionated investment memo — not a balanced summary. You are expected to take a clear position and defend it. You produce structured JSON only, no markdown or extra text.

ANALYTICAL FRAMEWORK (cover all of these in data_analysis):
- Business model quality
- Competitive moat
- Financial profile and how it's evolving over time
- Unit economics
- Management quality
- Key risks (bull and bear cases)
- Final recommendation with price target or conviction level

QUANTITATIVE GROUNDING: Every major claim must be accompanied by a data point, ratio, or comparable from the actual company and sources. Use ONLY real numbers from your research—never placeholder, example, or instructional text from these prompts. Structure: [metric] + [actual number] + [comparison/context].

RECENCY FLAG: For topics where timeliness matters, explicitly note the vintage of your information and flag if you believe material developments may have occurred beyond your knowledge.

INDEPENDENT ANALYSIS (CRITICAL):
- Form your own analytical opinion. Do NOT simply summarize management commentary or earnings highlights. Challenge management's narrative. Compare to historical trends. Assess what the data actually implies for the business quality and investor.
- You MUST cover the last 4 quarters of financial performance. Include quarter-over-quarter or YoY trends for key metrics (revenue, margins, billings, etc.). Describe trajectory—is performance improving, deteriorating, or stable? What does that imply?
- Valuation: If you mention valuation risk or opportunity, provide current multiples (e.g. EV/NTM revenue), historical range, peer comparison, and what it implies about entry point. No generic "valuation risk" without numbers.
- You may incorporate well-known recent sector events (e.g. sector selloffs, regulatory news, competitor announcements) when you have high confidence—cite as "sector context" and note if not from search. Prioritize search results for company-specific data.

CRITICAL ANALYSIS REQUIREMENTS:
- Prioritize primary sources (earnings transcripts, SEC filings, 10-Ks, investor presentations) over news summaries. When sources are secondary or thin, say so and lower confidence_score.
- Be critical: challenge weak claims, note conflicts. Do not summarize—analyze, interpret, flag gaps.
- If search results are low quality, acknowledge it and reflect in confidence_score (0.3–0.5). Do not dress up weak sources.
- Use the provided web search results and user-provided documents for company-specific data. Cite by title and URL. If search does not cover a topic, say so. Do not invent numbers.
- When sources conflict, say so and interpret.
- End data_analysis with: "What would change my view: [catalyst or data point]."

Your response must be a single valid JSON object with this exact structure (no code block, no \`\`\`json):
{
  "data_analysis": "string: analytical, opinionated analysis covering the framework above. Every major claim must have a data point, ratio, or comparable. End with 'What would change my view: [catalyst or data point]'.",
  "key_assumptions_and_confidence": "string: MANDATORY. Distinguish what you know with high confidence vs. what you're inferring. List 2-4 key assumptions and your confidence level (high/medium/low) for each. Flag any areas where data vintage or recency may be a concern.",
  "technical_analysis": {
    "trend_levels": "string: key support/resistance, moving averages, trend context",
    "stochastic_indicators": "string: RSI, stochastics, momentum if available from sources",
    "options_volume": "string: options volume, open interest, put/call if available",
    "institutional_flow": "string: institutional buying/selling, 13F or flow data if available",
    "summary_view": "string: 2-3 sentence quant view of technical setup"
  },
  "citations": [{"title": "string", "url": "string"}],
  "confidence_score": number between 0 and 1 (lower when sources are thin or secondary)
}`;

function formatAttachmentContext(attachments: { name: string; content: string }[]): string {
  if (attachments.length === 0) return "";
  return attachments
    .map((a) => `--- ${a.name} ---\n${a.content}`)
    .join("\n\n");
}

function buildSpecialistUserPrompt(
  researchAsk: string,
  searchContext: string,
  attachmentContext: string
): string {
  const attachmentBlock =
    attachmentContext.trim().length > 0
      ? `\nUser-provided documents (use these in addition to web search; cite as "[filename] (user-provided)" in citations):\n\n${attachmentContext}\n\n`
      : "";

  return `Research ask: ${researchAsk}
${attachmentBlock}Web search results (prioritize these for company-specific data; cite in citations. Form an independent analytical opinion—do not just summarize. Cover 4 quarters, valuation nuance, trajectory.):

${searchContext}

Produce your analysis as a single JSON object with the exact schema described in your system prompt. Output only the JSON.`;
}

export async function runSpecialist(
  name: "alpha" | "beta" | "gamma",
  researchAsk: string,
  searchContext: string,
  attachmentContext: string = ""
): Promise<{ name: string; raw: string; parsed: SpecialistOutput | null }> {
  const model = MODELS[name];
  const userPrompt = buildSpecialistUserPrompt(researchAsk, searchContext, attachmentContext);
  const raw = await chat(model, [
    { role: "system", content: SPECIALIST_SYSTEM },
    { role: "user", content: userPrompt },
  ], { temperature: 0.3, maxTokens: 4096 });

  let parsed: SpecialistOutput | null = null;
  try {
    const cleaned = raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, "$1").trim();
    parsed = JSON.parse(cleaned) as SpecialistOutput;
  } catch {
    parsed = null;
  }
  return { name: name.toUpperCase(), raw, parsed };
}

const MEMO_TEMPLATE = `
**1. Council Synthesis**
Where the three specialists agreed, where they diverged, and how that informed your final view. Use model names (Gemini, Claude, ChatGPT) when referencing their positions.

**2. Executive Summary**
5–7 sentences, standalone readable. Must include your recommendation. No prior context needed.

**3. Investment Thesis**
3 core pillars, each with supporting evidence. Quantitative grounding required.

**4. Business Quality Assessment**
Moat, competitive dynamics, management quality.

**5. Financial Analysis**
Key metrics, trends, peer comparison. Data points required.

**6. Bull Case / Bear Case**
Quantified scenarios where possible (e.g. upside/downside ranges).

**7. Key Risks**
Ranked by probability × impact. Bullet list.

**8. Recommendation & Conviction**
Explicit, justified, actionable. Price target or conviction level.

**9. Footnotes**
^1 Title — URL. ^2 Title — URL. etc. All citations from specialist reports.
`;

const CHAIRMAN_SYSTEM = `You are the senior PM who has read three smart analysts' views and must now decide. Your job is synthesis and judgment, not recap. Where specialists disagree: explain why one argument is more compelling. Where they agree: assess whether that consensus is well-founded or groupthink.

ORIGINAL ANALYSIS: Each section must add distinct value. Avoid redundancy—do not repeat the same points across sections. Push beyond management commentary: what does the data imply? Trajectory of financial performance over 4 quarters? Valuation: current multiples, historical range, peer comparison, entry point implications. No generic statements without quantitative backing.

QUANTITATIVE GROUNDING: Every major claim must have a data point, ratio, or comparable from the specialist reports. Use ONLY real numbers—never placeholder or example text.

RECENCY FLAG: Note vintage of information and flag if material developments may have occurred beyond the specialists' knowledge.

FORMATTING — USE THIS EXACT TEMPLATE (locked in code, not your discretion):
${MEMO_TEMPLATE}

STRICT RULES:
- Do not add sections not listed above. Do not omit sections.
- Each section header must be bolded and numbered exactly as shown (e.g. **1. Council Synthesis**, **2. Executive Summary**).
- Use footnote numbers (^1, ^2, ...) in the body; list full citations in section 9. Do NOT use inline [title](url) links.
- Output only Markdown. No code blocks around the markdown.
- Maximum length: 2 pages when printed (roughly 800–1000 words). Be concise.
- Every material claim traceable to the specialist reports. Do not invent data.
- Format the output so it reads as a professional investment memo, not a chat response.`;

function buildChairmanUserPrompt(
  researchAsk: string,
  alpha: { name: string; raw: string; parsed: SpecialistOutput | null },
  beta: { name: string; raw: string; parsed: SpecialistOutput | null },
  gamma: { name: string; raw: string; parsed: SpecialistOutput | null },
  attachmentContext: string = ""
): string {
  const attachmentBlock =
    attachmentContext.trim().length > 0
      ? `\nUser-provided documents (for context; specialists had access to these):\n\n${attachmentContext}\n\n`
      : "";

  return `Research ask: ${researchAsk}
${attachmentBlock}Specialist reports (use these to write the memo). Model mapping: Alpha = Claude, Beta = ChatGPT, Gamma = Gemini.

--- Agent Alpha (Claude) ---
${alpha.parsed ? JSON.stringify(alpha.parsed, null, 2) : alpha.raw}

--- Agent Beta (ChatGPT) ---
${beta.parsed ? JSON.stringify(beta.parsed, null, 2) : beta.raw}

--- Agent Gamma (Gemini) ---
${gamma.parsed ? JSON.stringify(gamma.parsed, null, 2) : gamma.raw}

Produce the executive memo in Markdown only (no \`\`\`markdown wrapper). Follow the exact template from your system prompt: all 9 sections, numbered and bolded headers, no additions or omissions. Use footnotes for citations. Your job is synthesis and judgment—decide, do not summarize.`;
}

export async function runChairman(
  researchAsk: string,
  alpha: { name: string; raw: string; parsed: SpecialistOutput | null },
  beta: { name: string; raw: string; parsed: SpecialistOutput | null },
  gamma: { name: string; raw: string; parsed: SpecialistOutput | null },
  attachmentContext: string = ""
): Promise<string> {
  const userPrompt = buildChairmanUserPrompt(researchAsk, alpha, beta, gamma, attachmentContext);
  return chat(MODELS.chairman, [
    { role: "system", content: CHAIRMAN_SYSTEM },
    { role: "user", content: userPrompt },
  ], { temperature: 0.3, maxTokens: 2048 });
}

/** Use only the "Data for analysis" portion for Tavily search; omit "Memo goal". */
function extractDataForAnalysisSection(researchAsk: string): string {
  const trimmed = researchAsk.trim();
  const dataMatch = trimmed.match(/Data for analysis:\s*([\s\S]*?)(?=\s*Memo goal:|$)/i);
  const section = dataMatch?.[1]?.trim() ?? trimmed;
  return section;
}

export async function runResearchPipeline(
  researchAsk: string,
  attachments: { name: string; content: string }[] = []
): Promise<{
  memo: string;
  specialistOutputs: { name: string; raw: string; parsed: SpecialistOutput | null }[];
}> {
  const dataSection = extractDataForAnalysisSection(researchAsk);
  const searchQueries = [
    { query: dataSection + " Q1 Q2 Q3 Q4 earnings transcript last 4 quarters 10-K 10-Q SEC filing", options: { maxResults: 8 } },
    { query: dataSection + " valuation multiples P/E EV revenue historical peer comparison", options: { maxResults: 6 } },
    { query: dataSection + " stock price technical analysis institutional flow", options: { maxResults: 6 } },
    { query: dataSection + " sector macro trends competitive dynamics", options: { maxResults: 6 } },
    { query: dataSection + " cybersecurity software stocks news", options: { topic: "news" as const, timeRange: "week" as const, maxResults: 6 } },
    { query: dataSection + " analyst rating price target", options: { maxResults: 5 } },
  ];
  const searchResults = await webSearchMulti(searchQueries);
  const searchContext = formatSearchContext(searchResults);
  const attachmentContext = formatAttachmentContext(attachments);

  const [alpha, beta, gamma] = await Promise.all([
    runSpecialist("alpha", researchAsk, searchContext, attachmentContext),
    runSpecialist("beta", researchAsk, searchContext, attachmentContext),
    runSpecialist("gamma", researchAsk, searchContext, attachmentContext),
  ]);

  const memo = await runChairman(researchAsk, alpha, beta, gamma, attachmentContext);

  return {
    memo: memo.replace(/^```\s*markdown?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim(),
    specialistOutputs: [alpha, beta, gamma],
  };
}

// --- Mock pipeline for frontend testing (no API calls) ---

const MOCK_SPECIALIST: SpecialistOutput = {
  data_analysis:
    "Mock data analysis: Based on available sources, the name/sector referenced in the research ask shows recent volatility. Key metrics and time frames would be populated from live search in production.",
  key_assumptions_and_confidence:
    "Mock: Key assumptions would list 2-4 items with high/medium/low confidence. Data vintage would be flagged where relevant.",
  technical_analysis: {
    trend_levels: "Support near recent lows; resistance at prior highs. Moving averages suggest neutral to bullish short-term bias.",
    stochastic_indicators: "RSI in mid-range; stochastic not overbought or oversold. Momentum indicators would be filled from live data.",
    options_volume: "Options volume elevated relative to average; put/call ratio and open interest would be cited from live sources.",
    institutional_flow: "Institutional ownership and 13F flow data would be summarized here from search results.",
    summary_view: "Quant view: range-bound with upside bias pending catalyst. Levels and flows to be confirmed with live data.",
  },
  citations: [
    { title: "Example Source 1", url: "https://example.com/1" },
    { title: "Example Source 2", url: "https://example.com/2" },
  ],
  confidence_score: 0.72,
};

const MOCK_MEMO = `**1. Council Synthesis**

Mock—in live runs: where Gemini, Claude, and ChatGPT agreed, where they diverged, and how that informed the final view.

**2. Executive Summary**

Mock mode active. Once live agents are enabled, 5–7 standalone sentences with recommendation would appear here. Set \`USE_MOCK_AGENTS=false\` for real memos.

**3. Investment Thesis**

Mock—3 core pillars with supporting evidence from specialist reports.

**4. Business Quality Assessment**

Mock—moat, competitive dynamics, management from live specialist analysis.

**5. Financial Analysis**

Mock—key metrics, trends, peer comparison with data points.

**6. Bull Case / Bear Case**

Mock—quantified scenarios where possible.

**7. Key Risks**

- Market risk, sector rotation, company-specific risks (mock).

**8. Recommendation & Conviction**

Mock—explicit recommendation with price target or conviction level.

**9. Footnotes**

^1 Example Source 1 — https://example.com/1
^2 Example Source 2 — https://example.com/2
`;

async function runMockResearchPipeline(researchAsk: string): Promise<{
  memo: string;
  specialistOutputs: { name: string; raw: string; parsed: SpecialistOutput | null }[];
}> {
  await new Promise((r) => setTimeout(r, 1200));
  const alpha = { name: "ALPHA", raw: JSON.stringify(MOCK_SPECIALIST), parsed: MOCK_SPECIALIST };
  const beta = { name: "BETA", raw: JSON.stringify(MOCK_SPECIALIST), parsed: MOCK_SPECIALIST };
  const gamma = { name: "GAMMA", raw: JSON.stringify(MOCK_SPECIALIST), parsed: MOCK_SPECIALIST };
  return {
    memo: MOCK_MEMO.replace(
      /\{\{research_ask\}\}/g,
      researchAsk.slice(0, 200)
    ),
    specialistOutputs: [alpha, beta, gamma],
  };
}

/** Use mock pipeline when USE_MOCK_AGENTS is "true" (default for testing). Set to "false" for live LLM calls. */
export async function runResearchPipelineOrMock(
  researchAsk: string,
  attachments: { name: string; content: string }[] = []
): Promise<{
  memo: string;
  specialistOutputs: { name: string; raw: string; parsed: SpecialistOutput | null }[];
}> {
  const useMock =
    process.env.USE_MOCK_AGENTS === undefined ||
    process.env.USE_MOCK_AGENTS === "" ||
    process.env.USE_MOCK_AGENTS.toLowerCase() === "true";
  if (useMock) {
    return runMockResearchPipeline(researchAsk);
  }
  return runResearchPipeline(researchAsk, attachments);
}
