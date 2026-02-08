"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { signIn, signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "./components/ThemeToggle";

type ResearchState = "idle" | "loading" | "done" | "error";

type MemoResult = {
  id?: string;
  title?: string;
  memo: string;
  researchAsk: string;
  generatedAt: string;
  runId: string;
  models: string;
};

type SavedMemoItem = MemoResult & { id: string; title: string };

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

function oneLineDescription(researchAsk: string): string {
  const first = researchAsk.split(/\n/)[0]?.trim() ?? researchAsk.trim();
  return first.length > 120 ? first.slice(0, 117) + "…" : first;
}

const DEFAULT_RESEARCH_ASK = `Data for analysis: Analyze last 4 earnings release, call transcripts, and stock performance for PANW, CRWD, ZS, RBRK. Look at macro trends for Cybersecurity, Software sector, think about trajectory of these businesses over the next year.

Memo goal: Provide an executive summary on likely performance, narrative and stock performance of these businesses for next earnings. Note upside and downside scenarios. Be explicit with assumptions, reasoning. Memo should help rigorous debate and critique.`;

type Tab = "research" | "previous";

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("research");
  const [memoTitle, setMemoTitle] = useState("");
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

  // After OAuth redirect, cookie may be set but first paint had no session — refetch and reload once if we find a session
  useEffect(() => {
    if (status !== "unauthenticated") return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data?.user) window.location.reload();
      } catch {
        // ignore
      }
    }, 1200);
    return () => clearTimeout(t);
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
      const title = memoTitle.trim() || "Untitled memo";
      const newResult: MemoResult = {
        title,
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

  function openMemo(m: SavedMemoItem) {
    setResult(m);
    setActiveTab("research");
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

      <nav className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("research")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "research"
                ? "border-[#ccff00] text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Research
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("previous")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "previous"
                ? "border-[#ccff00] text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Previous Memos
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {activeTab === "research" && (
          <>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="memo_title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Memo Title
          </label>
          <input
            id="memo_title"
            type="text"
            value={memoTitle}
            onChange={(e) => setMemoTitle(e.target.value)}
            placeholder="e.g. Cybersecurity names (PANW, CRWD, ZS, RBRK)"
            className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-[#ccff00]/50 dark:focus:border-[#ccff00] transition-colors"
            disabled={state === "loading"}
          />
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
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {researchAsk.length.toLocaleString()} characters
          </p>
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
          </>
        )}

        {activeTab === "previous" && (
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
            {status !== "authenticated" ? (
              <div className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                Sign in with Google to see your previous memos.
              </div>
            ) : historyMemos.length === 0 ? (
              <div className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                No saved memos yet. Generate a memo on the Research tab and it will appear here.
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                  <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Previous memos</h2>
                  <button
                    type="button"
                    onClick={deleteAllMemos}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete all
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                        <th className="px-4 py-3 font-medium w-[140px]">Date and Time</th>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium min-w-[200px]">Description</th>
                        <th className="px-4 py-3 font-medium w-[70px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyMemos.map((m) => (
                        <tr key={m.id} className="border-b border-neutral-100 dark:border-neutral-800/80 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                            {formatGeneratedAt(m.generatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openMemo(m)}
                              className="text-emerald-700 dark:text-[#ccff00] font-medium hover:underline text-left"
                            >
                              {m.title || "Untitled memo"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 max-w-md">
                            {oneLineDescription(m.researchAsk)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => deleteMemo(m.id)}
                              className="text-xs text-neutral-500 hover:text-red-500"
                              aria-label="Delete memo"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
