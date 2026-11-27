import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildZip, crc32, uniqueNames } from "@/lib/zip";

describe("zip writer", () => {
  it("computes standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("dedupes and sanitizes names", () => {
    expect(uniqueNames(["a.pdf", "A.pdf", "a.pdf", "../x/../b.pdf", "2024/c.pdf"])).toEqual(["a.pdf", "A (2).pdf", "a (3).pdf", "x/b.pdf", "2024/c.pdf"]);
  });

  it("produces an archive that `unzip -t` accepts with exact contents", () => {
    const a = new TextEncoder().encode("%PDF-1.4 hello");
    const b = new Uint8Array(70_000).map((_, i) => i % 251);
    const parts = buildZip([
      { name: "2024/MCI511S_2024_S1_Test_1.pdf", data: a },
      { name: "Ünïcode naïve.pdf", data: b },
    ]);
    const buf = Buffer.concat(parts.map((p) => Buffer.from(p)));
    const dir = mkdtempSync(path.join(tmpdir(), "zip-"));
    const file = path.join(dir, "t.zip");
    writeFileSync(file, buf);
    let hasUnzip = true;
    try {
      execFileSync("unzip", ["-v"], { stdio: "ignore" });
    } catch {
      hasUnzip = false;
    }
    if (hasUnzip) {
      const out = execFileSync("unzip", ["-t", file]).toString();
      expect(out).toContain("No errors detected");
      execFileSync("unzip", ["-o", "-q", file, "-d", dir]);
      expect(readFileSync(path.join(dir, "2024/MCI511S_2024_S1_Test_1.pdf")).equals(Buffer.from(a))).toBe(true);
    }
    // End-of-central-directory record present with 2 entries
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    expect(eocd).toBeGreaterThan(0);
    expect(buf.readUInt16LE(eocd + 10)).toBe(2);
  });
});
