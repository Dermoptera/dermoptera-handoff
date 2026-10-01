import { HandoffError } from "./errors.js";

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder("utf-8", { fatal: true });

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function unbase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new HandoffError("INVALID_FRAGMENT", "The handoff link is malformed.");
  try {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (base64url(bytes) !== value) throw new HandoffError("INVALID_FRAGMENT", "The handoff link is not canonically encoded.");
    return bytes;
  } catch (cause) {
    throw new HandoffError("INVALID_FRAGMENT", "The handoff link is malformed.", { cause });
  }
}

export function randomBytes(length: number, cryptoProvider: Crypto = globalThis.crypto): Uint8Array {
  if (!cryptoProvider?.getRandomValues || !cryptoProvider.subtle) {
    throw new HandoffError("CRYPTO_UNAVAILABLE", "Web Crypto is unavailable. A secure context is required.");
  }
  return cryptoProvider.getRandomValues(new Uint8Array(length));
}

export async function sha256(bytes: Uint8Array, cryptoProvider: Crypto = globalThis.crypto): Promise<Uint8Array> {
  if (!cryptoProvider?.subtle) throw new HandoffError("CRYPTO_UNAVAILABLE", "Web Crypto is unavailable.");
  return new Uint8Array(await cryptoProvider.subtle.digest("SHA-256", toArrayBuffer(bytes)));
}
