import { HandoffError } from "./errors.js";
import type { JsonValue, StateEnvelope } from "./types.js";

export const MAX_PLAINTEXT_BYTES = 32_768;
export const MAX_CIPHERTEXT_BYTES = MAX_PLAINTEXT_BYTES + 16;
export const DEFAULT_TTL_SECONDS = 600;
export const MIN_TTL_SECONDS = 60;
export const MAX_TTL_SECONDS = 1_800;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const APP_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,62}[a-z0-9])?$/;
const SCHEMA_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62})$/;

export function assertIdentifiers(appId: string, schemaVersion: string): void {
  if (!APP_ID_PATTERN.test(appId)) throw new HandoffError("INVALID_STATE", "appId must be 3-64 lowercase URL-safe characters.");
  if (!SCHEMA_PATTERN.test(schemaVersion)) throw new HandoffError("INVALID_STATE", "schemaVersion must be 1-63 URL-safe characters.");
}

export function assertTtl(ttl: number): void {
  if (!Number.isInteger(ttl) || ttl < MIN_TTL_SECONDS || ttl > MAX_TTL_SECONDS) {
    throw new HandoffError("INVALID_STATE", `ttl must be an integer between ${MIN_TTL_SECONDS} and ${MAX_TTL_SECONDS} seconds.`);
  }
}

export function sanitizeJson(value: unknown, depth = 0): JsonValue {
  if (depth > 32) throw new HandoffError("INVALID_STATE", "State nesting exceeds 32 levels.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new HandoffError("INVALID_STATE", "State numbers must be finite.");
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => sanitizeJson(entry, depth + 1));
  if (typeof value === "object") {
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new HandoffError("INVALID_STATE", "State must contain plain objects only.");
    const clean = Object.create(null) as Record<string, JsonValue>;
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) throw new HandoffError("INVALID_STATE", `State contains forbidden key: ${key}.`);
      if (typeof entry === "undefined" || typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
        throw new HandoffError("INVALID_STATE", `State contains a non-JSON value at ${key}.`);
      }
      clean[key] = sanitizeJson(entry, depth + 1);
    }
    return clean;
  }
  throw new HandoffError("INVALID_STATE", "State must be JSON-compatible.");
}

export function serializeEnvelope(envelope: StateEnvelope): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify(envelope));
  if (bytes.byteLength > MAX_PLAINTEXT_BYTES) throw new HandoffError("PAYLOAD_TOO_LARGE", "Encrypted state exceeds the 32 KiB plaintext limit.");
  return bytes;
}

export function parseEnvelope(bytes: Uint8Array): StateEnvelope {
  if (bytes.byteLength > MAX_PLAINTEXT_BYTES) throw new HandoffError("PAYLOAD_TOO_LARGE", "Decrypted state exceeds the 32 KiB limit.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (cause) {
    throw new HandoffError("INVALID_STATE", "Decrypted state is not valid UTF-8 JSON.", { cause });
  }
  const clean = sanitizeJson(parsed);
  if (!clean || Array.isArray(clean) || typeof clean !== "object") throw new HandoffError("INVALID_STATE", "State envelope must be an object.");
  const keys = Object.keys(clean);
  const allowed = new Set(["protocolVersion", "appId", "schemaVersion", "createdAt", "state"]);
  if (keys.some((key) => !allowed.has(key))) throw new HandoffError("INVALID_STATE", "State envelope contains unknown fields.");
  const candidate = clean as Record<string, JsonValue>;
  if (candidate.protocolVersion !== 1 || typeof candidate.appId !== "string" || typeof candidate.schemaVersion !== "string" ||
      typeof candidate.createdAt !== "number" || !("state" in candidate)) {
    throw new HandoffError("INVALID_STATE", "State envelope fields are invalid.");
  }
  assertIdentifiers(candidate.appId, candidate.schemaVersion);
  return {
    protocolVersion: 1,
    appId: candidate.appId,
    schemaVersion: candidate.schemaVersion,
    createdAt: candidate.createdAt,
    state: candidate.state as JsonValue,
  };
}
