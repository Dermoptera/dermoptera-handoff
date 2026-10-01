import { decryptEnvelope, encryptEnvelope, parseFragment } from "./crypto.js";
import { HandoffError, normalizeError } from "./errors.js";
import { DEFAULT_TTL_SECONDS, assertIdentifiers, assertTtl, sanitizeJson } from "./safety.js";
import type { ApplicationAdapter, ClaimedState, ClaimOptions, CreateOptions, JsonValue, ResumeOptions, ResumeResult, Transfer, Transport } from "./types.js";

export class HandoffClient {
  readonly appId: string;
  readonly schemaVersion: string;
  readonly transport: Transport;
  readonly cryptoProvider: Crypto;

  constructor(options: { appId: string; schemaVersion: string; transport: Transport; cryptoProvider?: Crypto }) {
    assertIdentifiers(options.appId, options.schemaVersion);
    this.appId = options.appId;
    this.schemaVersion = options.schemaVersion;
    this.transport = options.transport;
    this.cryptoProvider = options.cryptoProvider ?? globalThis.crypto;
  }

  async create<T extends JsonValue>(options: CreateOptions<T>): Promise<Transfer> {
    const ttl = options.ttl ?? DEFAULT_TTL_SECONDS;
    assertTtl(ttl);
    const state = sanitizeJson(options.state);
    const encrypted = await encryptEnvelope({
      protocolVersion: 1,
      appId: this.appId,
      schemaVersion: this.schemaVersion,
      createdAt: Date.now(),
      state,
    }, ttl, this.cryptoProvider);
    const response = await this.transport.create(encrypted.createRequest);
    const url = new URL(options.continueUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new HandoffError("INVALID_STATE", "continueUrl must use HTTPS except on localhost.");
    }
    url.search = "";
    url.hash = encrypted.fragment;
    return { url: url.toString(), expiresAt: response.expiresAt };
  }

  async claim<T extends JsonValue>(options: ClaimOptions<T>): Promise<ClaimedState<T>> {
    try {
      const source = options.url ?? globalThis.location?.href;
      if (!source) throw new HandoffError("INVALID_FRAGMENT", "A handoff URL is required.");
      const url = new URL(source);
      const fragment = parseFragment(url.hash);
      if (options.removeFragment !== false && typeof globalThis.history !== "undefined" && globalThis.location?.href === source) {
        globalThis.history.replaceState(null, "", url.pathname + url.search);
      }
      const claimed = await this.transport.claim({ lookup: fragment.lookup, token: fragment.token });
      const envelope = await decryptEnvelope(claimed.ciphertext, claimed.iv, fragment, this.cryptoProvider);
      if (envelope.appId !== options.expectedAppId) throw new HandoffError("APP_MISMATCH", "The state belongs to a different application.");
      if (envelope.schemaVersion !== options.expectedSchemaVersion) throw new HandoffError("SCHEMA_MISMATCH", "The state schema version is unsupported.");
      if (!options.validateIncomingState(envelope.state)) throw new HandoffError("INVALID_STATE", "The application rejected the incoming state.");
      return { state: envelope.state, appId: envelope.appId, schemaVersion: envelope.schemaVersion, createdAt: envelope.createdAt, expiresAt: claimed.expiresAt };
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async createFromAdapter<T extends JsonValue>(adapter: ApplicationAdapter<T>, options: Omit<CreateOptions<T>, "state">): Promise<Transfer> {
    return this.create({ ...options, state: await adapter.exportState() });
  }

  async claimAndResume<T extends JsonValue>(options: ResumeOptions<T>): Promise<ResumeResult<T>> {
    const source = options.url ?? globalThis.location?.href;
    if (!source) throw new HandoffError("INVALID_FRAGMENT", "A handoff URL is required.");
    const sourceUrl = new URL(source);
    parseFragment(sourceUrl.hash);
    if (options.removeFragment !== false && typeof globalThis.history !== "undefined" && globalThis.location?.href === source) {
      globalThis.history.replaceState(null, "", sourceUrl.pathname + sourceUrl.search);
    }
    const hasExisting = await options.adapter.hasExistingState();
    if (hasExisting && !(await options.adapter.confirmReplace())) return { status: "cancelled" };
    const claimed = await this.claim({
      url: source,
      expectedAppId: this.appId,
      expectedSchemaVersion: this.schemaVersion,
      validateIncomingState: options.adapter.validateIncomingState,
      removeFragment: false,
    });
    try {
      await options.adapter.importState(claimed.state);
    } catch (error) {
      if (error instanceof HandoffError) throw error;
      throw new HandoffError("STORAGE_UNAVAILABLE", "The transferred state could not be saved on this device.", { cause: error });
    }
    await options.adapter.resume();
    if (this.transport.event) void this.transport.event("resume").catch(() => undefined);
    return { status: "resumed", claimed };
  }
}
