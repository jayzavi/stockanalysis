"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type ResearchState = "idle" | "loading" | "done" | "error";

type MemoResult = {
  memo: string;
  researchAsk: string;
  generatedAt: string;
  runId: string;
  models: string;
};

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} at ${time}`;
}

export default function Home() {
  const [researchAsk, setResearchAsk] = useState("");
  const [state, setState] = useState<ResearchState>("idle");
  const [result, setResult] = useState<MemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!researchAsk.trim()) return;
    setState("loading");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ research_ask: researchAsk.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
        setState("error");
        return;
      }
      setResult({
        memo: data.memo ?? "",
        researchAsk: data.researchAsk ?? researchAsk.trim(),
        generatedAt: data.generatedAt ?? new Date().toISOString(),
        runId: data.runId ?? "",
        models: data.models ?? "",
      });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setState("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Stock Research Engine
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Multi-agent executive memos · Council of LLMs
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="research_ask" className="block text-sm font-medium text-zinc-300">
            Research Ask
          </label>
          <textarea
            id="research_ask"
            value={researchAsk}
            onChange={(e) => setResearchAsk(e.target.value)}
            placeholder="e.g. NVDA technical and fundamental view for the next 3 months; key levels and institutional flow"
            className="w-full h-28 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none"
            disabled={state === "loading"}
          />
          <button
            type="submit"
            disabled={state === "loading" || !researchAsk.trim()}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white font-medium transition-colors"
          >
            {state === "loading" ? "Running agents…" : "Generate memo"}
          </button>
        </form>

        {state === "loading" && (
          <div className="mt-8 p-4 rounded-lg bg-zinc-900/80 border border-zinc-700 text-zinc-400 text-sm">
            Alpha, Beta, and Gamma are researching in parallel; Chairman will synthesize when ready.
          </div>
        )}

        {state === "error" && error && (
          <div className="mt-8 p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {state === "done" && result && (
          <article className="mt-8 rounded-xl border border-zinc-700/80 bg-zinc-900/50 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-700/80">
              <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
                Jay Money Insights
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Generated {formatGeneratedAt(result.generatedAt)}
                {result.runId && ` | Run ${result.runId}`}
              </p>
              <p className="text-sm text-zinc-500 mt-0.5">
                Models: {result.models}
              </p>
            </div>
            <div className="report-backdrop px-6 py-4 border-b border-zinc-700/80">
              <p className="text-xs font-medium text-sky-300/90 uppercase tracking-wider mb-2">
                Backdrop
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {result.researchAsk}
              </p>
            </div>
            <div className="p-6 prose-memo prose-invert max-w-none">
              <ReactMarkdown>{result.memo}</ReactMarkdown>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
