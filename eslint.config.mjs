import { defineConfig, globalIgnores } from "eslint/config";
import nextConfig from "eslint-config-next/index.js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals.js";
import nextTypescript from "eslint-config-next/typescript.js";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
]);

export default eslintConfig;