import { describe, expect, it } from "vitest";
import { FetchTransport, HandoffClient, HandoffError, MAX_PLAINTEXT_BYTES, parseEnvelope, parseFragment, sanitizeJson, type JsonValue } from "@dermoptera/handoff";
import { MemoryTransport, mutateBase64 } from "../helpers/memory-transport.js";

interface WizardState extends Record<string, JsonValue> { step: number; answer: string; }
const validator = (value: JsonValue): value is WizardState => Boolean(value && !Array.isArray(value) && typeof value === "object" &&
  (value as Record<string, JsonValue>).step === 2 && typeof (value as Record<string, JsonValue>).answer === "string");

function setup(schemaVersion = "v1") {
  const transport = new MemoryTransport();
  const client = new HandoffClient({ appId: "wizard-demo", schemaVersion, transport });
  return { transport, client };
}

describe("generic client core", () => {
  it("creates, encrypts, claims, validates, and decrypts state", async () => {
    const { transport, client } = setup();
    const state: WizardState = { step: 2, answer: "Garden office" };
    const transfer = await client.create({ state, ttl: 600, continueUrl: "https://app.example/continue" });
    expect(transport.request?.ciphertext).not.toContain("Garden office");
    expect(transfer.url).toMatch(/^https:\/\/app\.example\/continue#hfx1\./);
    const claimed = await client.claim({ url: transfer.url, expectedAppId: "wizard-demo", expectedSchemaVersion: "v1", validateIncomingState: validator, removeFragment: false });
    expect(claimed.state).toEqual(state);
  });

  it("rejects a second claim", async () => {
    const { client } = setup();
    const transfer = await client.create({ state: { step: 2, answer: "x" }, continueUrl: "https://app.example/continue" });
    await client.claim({ url: transfer.url, expectedAppId: "wizard-demo", expectedSchemaVersion: "v1", validateIncomingState: validator, removeFragment: false });
    await expect(client.claim({ url: transfer.url, expectedAppId: "wizard-demo", expectedSchemaVersion: "v1", validateIncomingState: validator, removeFragment: false })).rejects.toMatchObject({ code: "TRANSFER_UNAVAILABLE" });
  });

  it("rejects a wrong AES key", async () => {
    const { client } = setup();
    const transfer = await client.create({ state: { step: 2, answer: "x" }, continueUrl: "https://app.example/continue" });
    const [prefix, lookup, token, key] = new URL(transfer.url).hash.slice(1).split(".");
    const changed = new URL(transfer.url); changed.hash = [prefix, lookup, token, mutateBase64(key!)].join(".");
    await expect(client.claim({ url: changed.toString(), expectedAppId: "wizard-demo", expectedSchemaVersion: "v1", validateIncomingState: validator, removeFragment: false })).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  for (const field of ["ciphertext", "iv"] as const) {
    it(`rejects ${field} tampering`, async () => {
      const { transport, client } = setup();
      transport.claimMutation = (response) => ({ ...response, [field]: mutateBase64(response[field]) });
      const transfer = await client.create({ state: { step: 2, answer: "x" }, continueUrl: "https://app.example/continue" });
      await expect(client.claim({ url: transfer.url, expectedAppId: "wizard-demo", expectedSchemaVersion: "v1", validateIncomingState: validator, removeFragment: false })).rejects.toMatchObject({ code: "INVALID_STATE" });
    });
  }

  it("rejects a changed token and lookup", async () => {
    for (const index of [1, 2]) {
      const { client } = setup();
      const transfer = await client.create({ state: { step: 2, answer: "x" }, continueUrl: "https://app.example/continue" });
      const parts = new URL(transfer.url).hash.slice(1).split(".");
      parts[index] = mutateBase64(parts[index]!);
      const changed = new URL(transfer.url); changed.hash = parts.join(".");
      await expect(client.claim({ url: changed.toString(), expectedAppId: "wizard-demo", expectedSchemaVersion: "v1", validateIncomingState: validator, removeFragment: false })).rejects.toMatchObject({ code: "TRANSFER_UNAVAILABLE" });
    }
  });

  it("rejects non-canonical base64url fragments", () => {
    const canonical = "hfx1.AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    expect(() => parseFragment(canonical)).not.toThrow();
    expect(() => parseFragment(canonical.replace("AAAA.A", "AAAB.A"))).toThrowError(HandoffError);
  });

  it("rejects app and schema mismatches", async () => {
    for (const expected of [{ app: "other-app", schema: "v1", code: "APP_MISMATCH" }, { app: "wizard-demo", schema: "v2", code: "SCHEMA_MISMATCH" }]) {
      const { client } = setup();
      const transfer = await client.create({ state: { step: 2, answer: "x" }, continueUrl: "https://app.example/continue" });
      await expect(client.claim({ url: transfer.url, expectedAppId: expected.app, expectedSchemaVersion: expected.schema, validateIncomingState: validator, removeFragment: false })).rejects.toMatchObject({ code: expected.code });
    }
  });

  it("rejects invalid JSON, unknown envelope fields, and dangerous keys", () => {
    expect(() => parseEnvelope(new TextEncoder().encode("{"))).toThrowError(HandoffError);
    expect(() => parseEnvelope(new TextEncoder().encode(JSON.stringify({ protocolVersion: 1, appId: "wizard-demo", schemaVersion: "v1", createdAt: 1, state: {}, extra: true })))).toThrowError(HandoffError);
    const dangerous = JSON.parse('{"safe":1,"__proto__":{"polluted":true}}') as unknown;
    expect(() => sanitizeJson(dangerous)).toThrowError(HandoffError);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("rejects oversized state and invalid validator results", async () => {
    const { client } = setup();
    await expect(client.create({ state: { data: "x".repeat(MAX_PLAINTEXT_BYTES) }, continueUrl: "https://app.example/continue" })).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    const transfer = await client.create({ state: { step: 2, answer: "x" }, continueUrl: "https://app.example/continue" });
    await expect(client.claim({ url: transfer.url, expectedAppId: "wizard-demo", expectedSchemaVersion: "v1", validateIncomingState: (_state): _state is JsonValue => false, removeFragment: false })).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("protects existing state on cancel and replaces only after confirmation", async () => {
    const first = setup();
    const transfer = await first.client.create({ state: { step: 2, answer: "incoming" }, continueUrl: "https://app.example/continue" });
    let imported: WizardState = { step: 2, answer: "existing" };
    let confirmed = false;
    const adapter = {
      exportState: () => imported,
      validateIncomingState: validator,
      hasExistingState: () => true,
      confirmReplace: () => confirmed,
      importState: (state: WizardState) => { imported = state; },
      resume: () => undefined,
    };
    expect(await first.client.claimAndResume({ adapter, url: transfer.url, removeFragment: false })).toEqual({ status: "cancelled" });
    expect(imported.answer).toBe("existing");
    confirmed = true;
    expect((await first.client.claimAndResume({ adapter, url: transfer.url, removeFragment: false })).status).toBe("resumed");
    expect(imported.answer).toBe("incoming");
  });

  it("removes the fragment before prompting or making a claim", async () => {
    const { client } = setup();
    const transfer = await client.create({ state: { step: 2, answer: "incoming" }, continueUrl: "https://app.example/continue" });
    const calls: string[] = [];
    Object.defineProperty(globalThis, "location", { configurable: true, value: { href: transfer.url } });
    Object.defineProperty(globalThis, "history", { configurable: true, value: { replaceState: (_state: unknown, _title: string, url: string) => calls.push(url) } });
    try {
      const result = await client.claimAndResume({
        adapter: {
          exportState: () => ({ step: 2, answer: "existing" }),
          validateIncomingState: validator,
          hasExistingState: () => true,
          confirmReplace: () => false,
          importState: () => undefined,
          resume: () => undefined,
        },
      });
      expect(result.status).toBe("cancelled");
      expect(calls).toEqual(["/continue"]);
    } finally {
      Reflect.deleteProperty(globalThis, "location");
      Reflect.deleteProperty(globalThis, "history");
    }
  });

  it("reports Web Crypto and network failures without leaking state", async () => {
    const unavailable = new HandoffClient({ appId: "wizard-demo", schemaVersion: "v1", transport: new MemoryTransport(), cryptoProvider: {} as Crypto });
    await expect(unavailable.create({ state: { step: 2, answer: "private" }, continueUrl: "https://app.example/continue" })).rejects.toMatchObject({ code: "CRYPTO_UNAVAILABLE" });
    const transport = new FetchTransport({ endpoint: "https://api.example", fetcher: (() => Promise.reject(new TypeError("offline"))) as typeof fetch });
    await expect(transport.claim({ lookup: "x", token: "y" })).rejects.toMatchObject({ code: "NETWORK_ERROR", retryable: true });
  });

  it("enforces the supported TTL range", async () => {
    const { client } = setup();
    await expect(client.create({ state: { step: 2, answer: "x" }, ttl: 59, continueUrl: "https://app.example/continue" })).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(client.create({ state: { step: 2, answer: "x" }, ttl: 1801, continueUrl: "https://app.example/continue" })).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("reports an adapter write failure as storage unavailable", async () => {
    const { client } = setup();
    const transfer = await client.create({ state: { step: 2, answer: "incoming" }, continueUrl: "https://app.example/continue" });
    await expect(client.claimAndResume({
      url: transfer.url,
      removeFragment: false,
      adapter: {
        exportState: () => ({ step: 2, answer: "existing" }),
        validateIncomingState: validator,
        hasExistingState: () => false,
        confirmReplace: () => true,
        importState: () => { throw new DOMException("quota", "QuotaExceededError"); },
        resume: () => undefined,
      },
    })).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
  });
});
