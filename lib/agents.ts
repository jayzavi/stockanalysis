import { chat } from "./openrouter";
import { webSearch, type SearchResult } from "./tavily";

export const MODELS = {
  alpha: process.env.OPENROUTER_MODEL_ALPHA ?? "anthropic/claude-opus-4",
  beta: process.env.OPENROUTER_MODEL_BETA ?? "openai/gpt-4o",
  gamma: process.env.OPENROUTER_MODEL_GAMMA ?? "google/gemini-2.0-flash-exp",
  chairman: process.env.OPENROUTER_MODEL_CHAIRMAN ?? "anthropic/claude-sonnet-4",
} as const;

export type SpecialistOutput = {
  data_analysis: string;
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

const SPECIALIST_SYSTEM = `You are a quantitative equity research analyst. You produce structured JSON only, no markdown or extra text.

Use ONLY the provided web search results for data. Cite sources by including their title and URL in the citations array. If the search results do not cover a topic, say so briefly and do not invent data.

Your response must be a single valid JSON object with this exact structure (no code block, no \`\`\`json):
{
  "data_analysis": "string: analysis directly addressing the research ask, with numbers and time frames from the sources",
  "technical_analysis": {
    "trend_levels": "string: key support/resistance, moving averages, trend context",
    "stochastic_indicators": "string: RSI, stochastics, momentum if available from sources",
    "options_volume": "string: options volume, open interest, put/call if available",
    "institutional_flow": "string: institutional buying/selling, 13F or flow data if available",
    "summary_view": "string: 2-3 sentence quant view of technical setup"
  },
  "citations": [{"title": "string", "url": "string"}],
  "confidence_score": number between 0 and 1
}`;

function buildSpecialistUserPrompt(researchAsk: string, searchContext: string): string {
  return `Research ask: ${researchAsk}

Web search results (use only these; cite in citations):

${searchContext}

Produce your analysis as a single JSON object with the exact schema described in your system prompt. Output only the JSON.`;
}

export async function runSpecialist(
  name: "alpha" | "beta" | "gamma",
  researchAsk: string,
  searchContext: string
): Promise<{ name: string; raw: string; parsed: SpecialistOutput | null }> {
  const model = MODELS[name];
  const userPrompt = buildSpecialistUserPrompt(researchAsk, searchContext);
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

const CHAIRMAN_SYSTEM = `You are the Chairman synthesizing three specialist reports into one executive research memo.

Rules:
- Output only Markdown. No code blocks around the markdown.
- Maximum length: 2 pages when printed (roughly 800–1000 words). Be concise.
- Start with an Executive Summary (consensus view and key recommendation/outlook).
- Then briefly summarize agreement and disagreement across the three specialists.
- Include a short Technical View section (consensus on trend, levels, risk).
- End with Key Risks and a one-sentence Bottom Line.
- Do not invent data; base everything on the three JSON reports.`;

function buildChairmanUserPrompt(
  researchAsk: string,
  alpha: { name: string; raw: string; parsed: SpecialistOutput | null },
  beta: { name: string; raw: string; parsed: SpecialistOutput | null },
  gamma: { name: string; raw: string; parsed: SpecialistOutput | null }
): string {
  return `Research ask: ${researchAsk}

Specialist reports (use these to write the memo):

--- Agent Alpha ---
${alpha.parsed ? JSON.stringify(alpha.parsed, null, 2) : alpha.raw}

--- Agent Beta ---
${beta.parsed ? JSON.stringify(beta.parsed, null, 2) : beta.raw}

--- Agent Gamma ---
${gamma.parsed ? JSON.stringify(gamma.parsed, null, 2) : gamma.raw}

Produce the executive memo in Markdown only (no \`\`\`markdown wrapper).`;
}

export async function runChairman(
  researchAsk: string,
  alpha: { name: string; raw: string; parsed: SpecialistOutput | null },
  beta: { name: string; raw: string; parsed: SpecialistOutput | null },
  gamma: { name: string; raw: string; parsed: SpecialistOutput | null }
): Promise<string> {
  const userPrompt = buildChairmanUserPrompt(researchAsk, alpha, beta, gamma);
  return chat(MODELS.chairman, [
    { role: "system", content: CHAIRMAN_SYSTEM },
    { role: "user", content: userPrompt },
  ], { temperature: 0.3, maxTokens: 2048 });
}

export async function runResearchPipeline(researchAsk: string): Promise<{
  memo: string;
  specialistOutputs: { name: string; raw: string; parsed: SpecialistOutput | null }[];
}> {
  const searchQuery = `${researchAsk} stock price technical analysis recent performance institutional`;
  const searchResults = await webSearch(searchQuery, { maxResults: 10 });
  const searchContext = formatSearchContext(searchResults);

  const [alpha, beta, gamma] = await Promise.all([
    runSpecialist("alpha", researchAsk, searchContext),
    runSpecialist("beta", researchAsk, searchContext),
    runSpecialist("gamma", researchAsk, searchContext),
  ]);

  const memo = await runChairman(researchAsk, alpha, beta, gamma);

  return {
    memo: memo.replace(/^```\s*markdown?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim(),
    specialistOutputs: [alpha, beta, gamma],
  };
}

// --- Mock pipeline for frontend testing (no API calls) ---

const MOCK_SPECIALIST: SpecialistOutput = {
  data_analysis:
    "Mock data analysis: Based on available sources, the name/sector referenced in the research ask shows recent volatility. Key metrics and time frames would be populated from live search in production.",
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

const MOCK_MEMO = `# Executive Summary

**Consensus view (mock):** The council’s view is illustrative only while the app runs in mock mode. Once live agents are enabled, this section will reflect a synthesized view from Agent Alpha (Claude), Agent Beta (GPT), and Agent Gamma (Gemini) based on web search and technical analysis.

**Recommendation:** Use mock mode for UI development; switch to live APIs when ready for real research memos.

---

## Agreement & Disagreement Across Specialists

In mock mode, all three specialists return the same hardcoded structure. In production, the Chairman will summarize where Alpha, Beta, and Gamma agree (e.g., trend direction, key levels) and where they differ (e.g., confidence, time horizon).

---

## Technical View

- **Trend:** Neutral to bullish short-term (mock).
- **Key levels:** Support/resistance and moving averages would be consensus from live specialist JSON.
- **Risk:** Volatility and drawdown assumptions would be stated here.

---

## Key Risks

- Market risk, sector rotation, and company-specific risks would be listed from live reports.
- In mock mode, no real data is used.

---

## Bottom Line

*Mock mode active — enable live agents in \`.env.local\` (\`USE_MOCK_AGENTS=false\`) to generate real executive memos.*
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
export async function runResearchPipelineOrMock(researchAsk: string): Promise<{
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
  return runResearchPipeline(researchAsk);
}
