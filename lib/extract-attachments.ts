/** Extract text from uploaded files. Supports .txt, .md, .pdf */

export type ExtractedAttachment = {
  name: string;
  content: string;
};

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse is CJS; use require for Node API routes
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return (data as { text?: string }).text ?? "";
}

export async function extractTextFromFile(
  file: { name: string; arrayBuffer: () => Promise<ArrayBuffer> } | File
): Promise<ExtractedAttachment | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === "txt" || ext === "md" || ext === "markdown") {
    return {
      name: file.name,
      content: buffer.toString("utf-8"),
    };
  }

  if (ext === "pdf") {
    try {
      const text = await extractPdf(buffer);
      return {
        name: file.name,
        content: text || "(No extractable text in PDF)",
      };
    } catch (err) {
      return {
        name: file.name,
        content: `[Could not extract text from PDF: ${err instanceof Error ? err.message : "Unknown error"}]`,
      };
    }
  }

  return null;
}

export async function extractFromFiles(
  files: File[]
): Promise<ExtractedAttachment[]> {
  const results: ExtractedAttachment[] = [];
  for (const f of files) {
    const extracted = await extractTextFromFile(f);
    if (extracted && extracted.content.trim()) {
      results.push(extracted);
    }
  }
  return results;
}
