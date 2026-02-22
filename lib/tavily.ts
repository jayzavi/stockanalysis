import { tavily } from "@tavily/core";

const tvly = process.env.TAVILY_API_KEY
  ? tavily({ apiKey: process.env.TAVILY_API_KEY })
  : null;

export type SearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

const EXCLUDE_DOMAINS = [
  "reddit.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "youtube.com",
];

export type WebSearchOptions = {
  maxResults?: number;
  topic?: "general" | "news" | "finance";
  includeDomains?: string[];
  excludeDomains?: string[];
};

export async function webSearch(
  query: string,
  options?: WebSearchOptions
): Promise<SearchResult[]> {
  if (!tvly) {
    throw new Error("TAVILY_API_KEY is not set");
  }
  const maxResults = options?.maxResults ?? 8;
  const topic = options?.topic ?? "finance";
  const excludeDomains = options?.excludeDomains ?? EXCLUDE_DOMAINS;

  const searchParams: Record<string, unknown> = {
    maxResults,
    searchDepth: "advanced",
    includeAnswer: false,
    includeRawContent: false,
    topic,
    exclude_domains: excludeDomains,
  };
  if (options?.includeDomains && options.includeDomains.length > 0) {
    searchParams.include_domains = options.includeDomains;
  }

  const response = await tvly.search(query, searchParams as Record<string, unknown>);

  const results = (response.results ?? []).map(
    (r: { title?: string; url?: string; content?: string; score?: number }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: r.content ?? "",
      score: r.score,
    })
  );
  return results;
}

/** Run multiple searches in parallel and merge results, deduped by URL. */
export async function webSearchMulti(
  queries: string[],
  options?: WebSearchOptions
): Promise<SearchResult[]> {
  const resultsArrays = await Promise.all(
    queries.map((q) => webSearch(q.slice(0, 350), { ...options, maxResults: 5 }))
  );
  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const arr of resultsArrays) {
    for (const r of arr) {
      const norm = r.url.toLowerCase().replace(/\/$/, "");
      if (!seen.has(norm)) {
        seen.add(norm);
        merged.push(r);
      }
    }
  }
  return merged;
}
