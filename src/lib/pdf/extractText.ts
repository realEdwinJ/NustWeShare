/**
 * Extracts text from the first pages of a PDF for duplicate fingerprinting.
 * Works in Node and in Cloudflare Workers (pdfjs-serverless). Returns "" for scans without a text layer.
 * pdf.js may detach the buffer it is given, so it always receives its own copy.
 */
export async function extractPdfText(bytes: Uint8Array, maxPages = 5): Promise<{ text: string; error?: string }> {
  try {
    const { getDocument } = await import("pdfjs-serverless");
    const data = new Uint8Array(bytes.byteLength);
    data.set(bytes);
    const pdf = await getDocument({ data, verbosity: 0, isEvalSupported: false, useSystemFonts: false } as any).promise;
    let text = "";
    const n = Math.min(pdf.numPages, maxPages);
    for (let i = 1; i <= n; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + " ";
    }
    try {
      await (pdf as any).cleanup?.();
    } catch {}
    return { text };
  } catch (e) {
    return { text: "", error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}
