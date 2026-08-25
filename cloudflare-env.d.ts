declare global {
  interface CloudflareEnv {
    PAPERS_BUCKET: R2Bucket;
    DATABASE_URL: string;
    APP_SECRET: string;
    ADMIN_SECRET: string;
    NEXT_PUBLIC_APP_URL: string;
  }
}

export {};
