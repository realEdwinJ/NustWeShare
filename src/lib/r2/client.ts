// R2 abstraction per Spec 94 — native Worker binding, no S3 credentials in Worker
export interface Storage {
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresSeconds: number): Promise<string>;
}

// Local filesystem fallback for dev without R2 binding (not for prod per Spec 48)
import { promises as fs } from "fs";
import path from "path";

export class LocalStorage implements Storage {
  private base = path.join(process.cwd(), "uploads");
  async put(key: string, body: Buffer | Uint8Array): Promise<void> {
    const full = path.join(this.base, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body as Buffer);
  }
  async get(key: string): Promise<Buffer | null> {
    try {
      return (await fs.readFile(path.join(this.base, key))) as Buffer;
    } catch {
      return null;
    }
  }
  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.base, key));
    } catch {}
  }
  async getSignedUrl(key: string): Promise<string> {
    // For local dev, return local path — in production with R2 binding this is handled via /api/files which reads from PAPERS_BUCKET
    return `/api/files/${encodeURIComponent(key)}`;
  }
}

export class R2NativeStorage implements Storage {
  private bucket: any;

  constructor(bucket: any) {
    if (!bucket) throw new Error("PAPERS_BUCKET binding missing");
    this.bucket = bucket;
  }

  async put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
    await this.bucket.put(key, body as any, { httpMetadata: { contentType } });
  }

  async get(key: string): Promise<Buffer | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    const buf = await obj.arrayBuffer();
    return Buffer.from(buf);
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async getSignedUrl(key: string): Promise<string> {
    // For native R2, we don't generate S3 presigned URL — instead return /api/files which will stream via binding
    // This keeps Worker without credentials and uses R2 binding directly
    return `/api/files/${encodeURIComponent(key)}`;
  }
}

// Factory — choose adapter based on env (Spec 16,48)
// In Workers: env.PAPERS_BUCKET is available via getCloudflareContext().env.PAPERS_BUCKET
// In Node dev: falls back to LocalStorage
export function getStorage(): Storage {
  // Try to get native R2 binding from Cloudflare Workers context (OpenNext)
  try {
    // @ts-ignore — optional dependency, only available in Workers runtime
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env?.PAPERS_BUCKET) {
      return new R2NativeStorage(ctx.env.PAPERS_BUCKET);
    }
  } catch {}

  // Fallback for Node dev or when binding not available — check for S3 compat (external R2) only if explicitly needed
  // Per new requirement, we do NOT use S3 credentials in Worker — only native binding
  // So in all cases without native binding, use LocalStorage (dev)
  return new LocalStorage();
}
