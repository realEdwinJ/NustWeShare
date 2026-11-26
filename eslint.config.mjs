import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // DB rows / Cloudflare bindings are untyped at the edges; keep visible but non-blocking
      "@typescript-eslint/no-explicit-any": "warn",
      // getCloudflareContext() is required lazily so Node scripts/dev work without the Workers runtime
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      // Reading localStorage/matchMedia after mount is intentional (avoids hydration mismatches)
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
    "src/db/seed/data/**",
    "cloudflare-env.d.ts",
  ]),
]);

export default eslintConfig;
