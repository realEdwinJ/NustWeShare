# Duplicate Detection — Spec 25-32, 59

## Paper vs File (Spec 59)

- `papers` — academic identity: `module_id + academic_year + semester + assessment_type + assessment_number` → unique partial `WHERE status='active'`
- `paper_files` — file identity: `r2_object_key`, `sha256`, `textFingerprint`, `perceptualHash`, `isCanonical`

One `paper` can have many `paper_files` (different scans of same exam) — e.g., `ELC511S 2025 Exam` has `scan1.pdf` `scan2.pdf` `original.pdf` all pointing to same `paper.id`, one is `is_canonical=true`.

## Levels

### L1 SHA-256 (Spec 26)

`crypto.createHash('sha256')` on server after `validatePdfMagic`. If `paper_files.sha256` exists → exact binary duplicate → return `duplicate` + existing `paperId`, don't store again (Spec 74).

### L2 Metadata Signals (Spec 27)

`fileSize`, `pageCount` (via `pdf-lib`), `originalFilename`, `creation metadata` — signals, never proof alone. `filename alone NEVER sufficient`.

### L3 Text Fingerprint (Spec 28, No AI)

If PDF has text layer: `pdfjs-dist` extract first 5 pages → `normalizeText` (lower, collapse `\\s+`, strip `^\\d+$` page numbers, trim) → `SHA-256` → `textFingerprint`. Different resolutions same content → same fingerprint despite different `SHA-256`. Check `WHERE textFingerprint = ?` — if existing paper different `paperId` → `Possible duplicate` (Spec 32).

### L4 Scanned (Spec 29, stub)

Scanned PDFs no text → render to images → `pHash` per page → Hamming distance ≤8 → similarity score. Currently stub `perceptualHash=null`; false negatives tolerated (Spec 32: false positives worse).

## Handling (Spec 30-32)

- **Canonical** per Spec 31: `pickBestFile` prefers `textFingerprint` + `pageCount` + `200KB-2MB` + newest, `setCanonical` ensures one `is_canonical=true` per paper.
- **UI**: `components/upload/UploadClient` shows `Badge: Possible duplicate` + message `An existing paper appears... [Use existing paper] [Upload anyway]` — for MVP badge; force flag can be added via `?force=1`.
- **Async**: `waitUntil` or inline for v1 (Spec 76) — not blocking UI, simple.

## Testing

`tests/unit/textFingerprint.test.ts` — whitespace/case, `tests/security` — duplicate report, `upload` API handles `paper vs file` correctly.
