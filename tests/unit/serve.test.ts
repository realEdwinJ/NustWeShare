import { describe, it, expect } from "vitest";
import { parseRange, contentDisposition } from "@/lib/r2/serve";

describe("HTTP range parsing", () => {
  it("parses standard, open-ended and suffix ranges", () => {
    expect(parseRange("bytes=0-99", 1000)).toEqual({ offset: 0, length: 100 });
    expect(parseRange("bytes=900-", 1000)).toEqual({ offset: 900, length: 100 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ offset: 900, length: 100 });
    expect(parseRange("bytes=0-5000", 1000)).toEqual({ offset: 0, length: 1000 });
  });
  it("flags unsatisfiable ranges and ignores junk", () => {
    expect(parseRange("bytes=1000-", 1000)).toBe("invalid");
    expect(parseRange("bytes=5-1", 1000)).toBe("invalid");
    expect(parseRange(null, 1000)).toBeNull();
    expect(parseRange("items=0-1", 1000)).toBeNull();
  });
  it("builds safe content-disposition headers", () => {
    const h = contentDisposition("attachment", 'Ünï "bad"\r\n.pdf');
    expect(h).not.toMatch(/[\r\n]/);
    expect(h).toContain("filename*=UTF-8''");
    expect(h.startsWith("attachment;")).toBe(true);
  });
});
