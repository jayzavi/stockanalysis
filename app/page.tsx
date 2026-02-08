"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { signIn, signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "./components/ThemeToggle";

type ResearchState = "idle" | "loading" | "done" | "error";

type MemoResult = {
  id?: string;
  memo: string;
  researchAsk: string;
  generatedAt: string;
  runId: string;
  models: string;
};

type SavedMemoItem = MemoResult & { id: string };

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

const DEFAULT_RESEARCH_ASK = `Please analyze the last 4 earnings release and earnings call transcripts for each of these companies - PANW, CRWD, ZS, RBRK and the past year's stock reaction. Then zoom out , look at the macro trends impacting Cybersecurity, Software sector, think about the trajectory of these businesses over the next year. Taking all of that into account, please provide an executive summary on what will the likely performance and narrative and stock performance of these businesses be? What is the upside and downside case scenarios? How do you bound that - be explicit with your assumptions and reasoning and please generate all of the above to prepare for rigorous debate and critique.`;

export default function Home() {
  const { data: session, status } = useSession();
  const [researchAsk, setResearchAsk] = useState(DEFAULT_RESEARCH_ASK);
  const [state, setState] = useState<ResearchState>("idle");
  const [result, setResult] = useState<MemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyMemos, setHistoryMemos] = useState<SavedMemoItem[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/memos")
      .then((r) => r.ok ? r.json() : { memos: [] })
      .then((data) => setHistoryMemos(data.memos ?? []))
      .catch(() => setHistoryMemos([]));
  }, [status]);

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
      const newResult: MemoResult = {
        memo: data.memo ?? "",
        researchAsk: data.researchAsk ?? researchAsk.trim(),
        generatedAt: data.generatedAt ?? new Date().toISOString(),
        runId: data.runId ?? "",
        models: data.models ?? "",
      };
      setResult(newResult);
      setState("done");
      if (session) {
        try {
          await fetch("/api/memos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newResult),
          });
          const listRes = await fetch("/api/memos");
          if (listRes.ok) {
            const listData = await listRes.json();
            setHistoryMemos(listData.memos ?? []);
          }
        } catch {
          // ignore save failure
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setState("error");
    }
  }

  async function deleteMemo(id: string) {
    if (!session) return;
    const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setHistoryMemos((prev) => prev.filter((m) => m.id !== id));
      if (result && (result as SavedMemoItem).id === id) setResult(null);
    }
  }

  async function deleteAllMemos() {
    if (!session) return;
    if (!confirm("Delete all saved memos? This cannot be undone.")) return;
    const res = await fetch("/api/memos?all=true", { method: "DELETE" });
    if (res.ok) {
      setHistoryMemos([]);
      setResult(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              Stock Research Engine
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Multi-agent executive memos · Council of LLMs
            </p>
          </div>
          <div className="flex items-center gap-3">
            {status === "authenticated" && session?.user?.email && (
              <span className="text-sm text-neutral-500 truncate max-w-[160px]" title={session.user.email}>
                {session.user.email}
              </span>
            )}
            {status === "authenticated" ? (
              <button
                type="button"
                onClick={() => signOut()}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: typeof window !== "undefined" ? window.location.origin : undefined })}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Sign in with Google
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="research_ask" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Research Ask
          </label>
          <textarea
            id="research_ask"
            value={researchAsk}
            onChange={(e) => setResearchAsk(e.target.value)}
            placeholder="e.g. NVDA technical and fundamental view for the next 3 months; key levels and institutional flow"
            className="w-full h-28 px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-[#ccff00]/50 dark:focus:border-[#ccff00] resize-none transition-colors"
            disabled={state === "loading"}
          />
          <button
            type="submit"
            disabled={state === "loading" || !researchAsk.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] disabled:opacity-50 disabled:pointer-events-none text-black font-semibold transition-colors"
          >
            {state === "loading" ? "Running agents…" : "Generate memo"}
          </button>
        </form>

        {state === "loading" && (
          <div className="mt-8 p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-sm">
            Alpha, Beta, and Gamma are researching in parallel; Chairman will synthesize when ready.
          </div>
        )}

        {state === "error" && error && (
          <div className="mt-8 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {status === "authenticated" && historyMemos.length > 0 && (
          <section className="mt-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Memo history (Google Drive)</h2>
              <button
                type="button"
                onClick={deleteAllMemos}
                className="text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Delete all
              </button>
            </div>
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 max-h-48 overflow-y-auto">
              {historyMemos.map((m) => (
                <li key={m.id} className="px-4 py-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setResult(m)}
                    className="text-left text-sm text-neutral-700 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-[#ccff00] truncate flex-1 min-w-0"
                  >
                    Run {m.runId} · {formatGeneratedAt(m.generatedAt)}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMemo(m.id)}
                    className="text-xs text-neutral-500 hover:text-red-500 shrink-0"
                    aria-label="Delete memo"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {state === "done" && result && (
          <article className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">
                Jay Money Insights
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Generated {formatGeneratedAt(result.generatedAt)}
                {result.runId && ` | Run ${result.runId}`}
              </p>
              <p className="text-sm text-neutral-500 mt-0.5">
                Models: {result.models}
              </p>
            </div>
            <div className="report-backdrop px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-xs font-medium text-emerald-800 dark:text-[#ccff00] uppercase tracking-wider mb-2">
                Backdrop
              </p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {result.researchAsk}
              </p>
            </div>
            <div className="p-6 prose-memo max-w-none">
              <ReactMarkdown>{result.memo}</ReactMarkdown>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
