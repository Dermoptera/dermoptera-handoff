import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [
  { ignores: ["**/dist/**", "coverage/**", "node_modules/**"] },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser,
      parserOptions: {
        project: [
          "./packages/core/tsconfig.json",
          "./packages/ui/tsconfig.json",
          "./examples/quote-wizard/tsconfig.json",
          "./tsconfig.lint.json"
        ],
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unsafe-assignment": "error"
    }
  }
];
