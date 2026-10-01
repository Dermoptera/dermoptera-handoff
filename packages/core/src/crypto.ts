import { base64url, randomBytes, sha256, textEncoder, toArrayBuffer, unbase64url } from "./encoding.js";
import { HandoffError } from "./errors.js";
import { MAX_CIPHERTEXT_BYTES, parseEnvelope, serializeEnvelope } from "./safety.js";
import type { CreateRequest, JsonValue, StateEnvelope } from "./types.js";

const FRAGMENT_PREFIX = "hfx1";
const AAD_PREFIX = "handoff-state|v1|";

export interface FragmentData {
  lookup: string;
  token: string;
  key: Uint8Array;
}

export interface EncryptedTransfer {
  createRequest: CreateRequest;
  fragment: string;
}

export async function encryptEnvelope(envelope: StateEnvelope<JsonValue>, ttl: number, cryptoProvider: Crypto = globalThis.crypto): Promise<EncryptedTransfer> {
  if (!cryptoProvider?.subtle) throw new HandoffError("CRYPTO_UNAVAILABLE", "Web Crypto is unavailable.");
  const lookupBytes = randomBytes(16, cryptoProvider);
  const claimToken = randomBytes(32, cryptoProvider);
  const rawKey = randomBytes(32, cryptoProvider);
  const iv = randomBytes(12, cryptoProvider);
  const lookup = base64url(lookupBytes);
  const key = await cryptoProvider.subtle.importKey("raw", toArrayBuffer(rawKey), "AES-GCM", false, ["encrypt"]);
  const plaintext = serializeEnvelope(envelope);
  const ciphertext = new Uint8Array(await cryptoProvider.subtle.encrypt({
    name: "AES-GCM",
    iv: toArrayBuffer(iv),
    additionalData: toArrayBuffer(textEncoder.encode(AAD_PREFIX + lookup)),
    tagLength: 128,
  }, key, toArrayBuffer(plaintext)));
  return {
    createRequest: {
      lookup,
      tokenHash: base64url(await sha256(claimToken, cryptoProvider)),
      iv: base64url(iv),
      ciphertext: base64url(ciphertext),
      ttl,
    },
    fragment: [FRAGMENT_PREFIX, lookup, base64url(claimToken), base64url(rawKey)].join("."),
  };
}

export function parseFragment(value: string): FragmentData {
  const fragment = value.replace(/^#/, "");
  const parts = fragment.split(".");
  if (parts.length !== 4 || parts[0] !== FRAGMENT_PREFIX || !parts[1] || !parts[2] || !parts[3]) {
    throw new HandoffError("INVALID_FRAGMENT", "The handoff link fragment is invalid.");
  }
  const lookup = unbase64url(parts[1]);
  const token = unbase64url(parts[2]);
  const key = unbase64url(parts[3]);
  if (lookup.byteLength !== 16 || token.byteLength !== 32 || key.byteLength !== 32) {
    throw new HandoffError("INVALID_FRAGMENT", "The handoff link fragment has invalid lengths.");
  }
  return { lookup: parts[1], token: parts[2], key };
}

export async function decryptEnvelope(ciphertextValue: string, ivValue: string, fragment: FragmentData, cryptoProvider: Crypto = globalThis.crypto): Promise<StateEnvelope> {
  if (!cryptoProvider?.subtle) throw new HandoffError("CRYPTO_UNAVAILABLE", "Web Crypto is unavailable.");
  const ciphertext = unbase64url(ciphertextValue);
  const iv = unbase64url(ivValue);
  if (iv.byteLength !== 12 || ciphertext.byteLength < 17 || ciphertext.byteLength > MAX_CIPHERTEXT_BYTES) {
    throw new HandoffError("INVALID_STATE", "Encrypted state has invalid dimensions.");
  }
  try {
    const key = await cryptoProvider.subtle.importKey("raw", toArrayBuffer(fragment.key), "AES-GCM", false, ["decrypt"]);
    const plaintext = await cryptoProvider.subtle.decrypt({
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(textEncoder.encode(AAD_PREFIX + fragment.lookup)),
      tagLength: 128,
    }, key, toArrayBuffer(ciphertext));
    return parseEnvelope(new Uint8Array(plaintext));
  } catch (cause) {
    if (cause instanceof HandoffError) throw cause;
    throw new HandoffError("INVALID_STATE", "Encrypted state authentication failed.", { cause });
  }
}
