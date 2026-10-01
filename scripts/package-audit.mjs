import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const packages = ["packages/core", "packages/ui"];
const forbidden = [
  /\/Users\//,
  /CLOUDFLARE_API_TOKEN\s*=/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{24,}["']/i
];
const summary = [];

for (const directory of packages) {
  const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  if (manifest.private === true || !manifest.license || !manifest.exports || !manifest.types || manifest.sideEffects !== false) {
    throw new Error(`${manifest.name} metadata is incomplete.`);
  }
  const allowedRoots = new Set(["dist", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md", "package.json"]);
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) await walk(child);
      else files.push(child);
    }
  }
  await walk(directory);
  const publishable = files.filter((path) => allowedRoots.has(relative(directory, path).split("/")[0]));
  let bytes = 0;
  for (const path of publishable) {
    bytes += (await stat(path)).size;
    const content = await readFile(path, "utf8").catch(() => "");
    if (forbidden.some((pattern) => pattern.test(content))) throw new Error(`${relative(directory, path)} contains non-public data.`);
  }
  summary.push({ name: manifest.name, version: manifest.version, files: publishable.length, unpackedBytes: bytes });
}

process.stdout.write(`${JSON.stringify(summary)}\n`);
