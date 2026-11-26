// Copies the pdf.js worker into /public so the reader loads it same-origin (CSP: worker-src 'self').
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const src = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const dest = path.join(process.cwd(), "public", "pdf.worker.min.mjs");
mkdirSync(path.dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[pdf-worker] copied ${path.relative(process.cwd(), src)} → public/pdf.worker.min.mjs`);
