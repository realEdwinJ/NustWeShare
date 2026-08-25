// R2 abstraction per Spec 94 — keep business logic portable
export interface Storage {
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresSeconds: number): Promise<string>;
}

// Local filesystem fallback for dev without R2 creds (not for prod per Spec 48)
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
    // For local dev, return local path — in production this would be signed R2 URL
    return `/api/files/${encodeURIComponent(key)}`;
  }
}

export class R2Storage implements Storage {
  private client: any;
  private bucket: string;

  constructor() {
    // Lazy import to avoid bundling issues when env not set
    const { S3Client } = require("@aws-sdk/client-s3");
    const bucket = process.env.R2_BUCKET || "nustweshare-papers";
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("R2 credentials missing");
    this.bucket = bucket;
    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body as Buffer, ContentType: contentType }));
  }

  async get(key: string): Promise<Buffer | null> {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const chunks: Uint8Array[] = [];
      for await (const chunk of res.Body as any) chunks.push(chunk);
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getSignedUrl(key: string, expiresSeconds: number): Promise<string> {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: `inline; filename="${encodeURIComponent(key.split("/").pop() || "paper.pdf")}"` });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresSeconds });
  }
}

// Factory — choose adapter based on env (Spec 16,48)
export function getStorage(): Storage {
  const hasR2 = process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET;
  // In production (Workers) with R2 binding, use R2Storage; for local dev without creds, use LocalStorage
  if (hasR2) {
    try {
      return new R2Storage();
    } catch (e) {
      console.warn("[r2] failed to init R2Storage, fallback to LocalStorage", e);
      return new LocalStorage();
    }
  }
  return new LocalStorage();
}
