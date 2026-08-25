declare global {
  interface CloudflareEnv {
    PAPERS_BUCKET: R2Bucket;
    HYPERDRIVE: Hyperdrive;
    // DATABASE_URL is for local dev/drizzle-kit; in Workers, HYPERDRIVE.connectionString is used
    DATABASE_URL?: string;
    APP_SECRET: string;
    ADMIN_SECRET: string;
    NEXT_PUBLIC_APP_URL: string;
  }
}

export {};
