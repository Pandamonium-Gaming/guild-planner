import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import i18next from "eslint-plugin-i18next";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      i18next,
    },
    rules: {
      // Warn about text content that should probably be translated
      "i18next/no-literal-string": ["warn", {
        markupOnly: true,
        ignoreAttribute: ["className", "style", "type", "id", "name", "data-", "aria-", "role", "key", "href", "src", "alt"],
        ignore: ["^[A-Z_]+$", "^\\d+$"],
      }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);

export default eslintConfig;
