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

export async function webSearch(query: string, options?: { maxResults?: number }): Promise<SearchResult[]> {
  if (!tvly) {
    throw new Error("TAVILY_API_KEY is not set");
  }
  const maxResults = options?.maxResults ?? 8;
  const response = await tvly.search(query, {
    maxResults,
    searchDepth: "advanced",
    includeAnswer: false,
    includeRawContent: false,
  });
  const results = (response.results ?? []).map((r: { title?: string; url?: string; content?: string; score?: number }) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content ?? "",
    score: r.score,
  }));
  return results;
}
