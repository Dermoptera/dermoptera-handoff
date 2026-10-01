import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir("examples/quote-wizard/dist", { recursive: true });
await build({
  entryPoints: ["examples/quote-wizard/src/app.ts"],
  outfile: "examples/quote-wizard/dist/app.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  minify: true,
  alias: {
    "@dermoptera/handoff": new URL("../packages/core/src/index.ts", import.meta.url).pathname,
    "@dermoptera/handoff-ui": new URL("../packages/ui/src/index.ts", import.meta.url).pathname
  }
});
