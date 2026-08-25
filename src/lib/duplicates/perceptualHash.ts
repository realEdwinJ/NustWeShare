// Stub for scanned doc pHash per Spec 29 — will be implemented in Stage 10 with image rendering
// Returns null for now; don't block Stage 2 build
export async function perceptualHashFromPdf(_buffer: Buffer): Promise<string | null> {
  return null;
}

export function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) dist++;
  dist += Math.abs(a.length - b.length);
  return dist;
}
