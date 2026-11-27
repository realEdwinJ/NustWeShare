// Dev helper: generates realistic multi-page sample papers for local testing.
// Usage: node scripts/make-sample-pdfs.mjs <outDir>
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const out = process.argv[2] || "sample-pdfs";
mkdirSync(out, { recursive: true });
const specs = [
  ["MCI511S", 2024, 1, "TEST", 1], ["MCI511S", 2024, 1, "TEST", 2], ["MCI511S", 2024, 1, "EXAM", null],
  ["MCI511S", 2023, 1, "EXAM", null], ["MCI511S", 2023, 2, "SUPPLEMENTARY", null], ["MCI511S", 2022, 1, "QUIZ", 1],
  ["PLU411S", 2024, 1, "EXAM", null], ["COA511S", 2025, 1, "TEST", 1],
];
for (const [code, year, sem, type, num] of specs) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = 3 + ((year + (num ?? 0)) % 4);
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([595, 842]);
    p.drawText("NAMIBIA UNIVERSITY OF SCIENCE AND TECHNOLOGY", { x: 90, y: 790, size: 13, font: bold, color: rgb(0.06, 0.16, 0.31) });
    p.drawText(`${code} — ${type}${num ? " " + num : ""} — ${year} Semester ${sem}`, { x: 90, y: 765, size: 12, font });
    p.drawText(`Page ${i} of ${pages}`, { x: 480, y: 30, size: 9, font });
    for (let q = 1; q <= 6; q++) {
      p.drawText(`Question ${(i - 1) * 6 + q}. Evaluate the integral of f(x) = x^${q} and discuss convergence.`, { x: 60, y: 700 - q * 90, size: 11, font });
      p.drawText(`[${q * 2} marks]`, { x: 480, y: 680 - q * 90, size: 10, font: bold });
    }
  }
  const name = `${code}_${year}_${type}${num ? "_" + num : ""}_S${sem}.pdf`;
  writeFileSync(path.join(out, name), await doc.save());
}
console.log(`wrote ${specs.length} PDFs to ${out}`);
