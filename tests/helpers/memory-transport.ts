import { HandoffError, type ClaimRequest, type ClaimResponse, type CreateRequest, type CreateResponse, type Transport } from "@dermoptera/handoff";

export class MemoryTransport implements Transport {
  request?: CreateRequest;
  claimed = false;
  now = 1_800_000_000;
  claimMutation?: (response: ClaimResponse) => ClaimResponse;
  events: string[] = [];

  async create(request: CreateRequest): Promise<CreateResponse> {
    this.request = structuredClone(request);
    this.claimed = false;
    return { expiresAt: this.now + request.ttl };
  }

  async claim(request: ClaimRequest): Promise<ClaimResponse> {
    if (!this.request || this.claimed || request.lookup !== this.request.lookup) throw new HandoffError("TRANSFER_UNAVAILABLE", "Unavailable");
    const tokenBytes = decode(request.token);
    const tokenCopy = new Uint8Array(tokenBytes.byteLength); tokenCopy.set(tokenBytes);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", tokenCopy.buffer));
    if (encode(digest) !== this.request.tokenHash) throw new HandoffError("TRANSFER_UNAVAILABLE", "Unavailable");
    this.claimed = true;
    const response = { iv: this.request.iv, ciphertext: this.request.ciphertext, expiresAt: this.now + this.request.ttl };
    return this.claimMutation ? this.claimMutation(response) : response;
  }

  async event(name: "resume" | "error"): Promise<void> { this.events.push(name); }
}

export function decode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function mutateBase64(value: string): string {
  const bytes = decode(value);
  bytes[0] = (bytes[0] ?? 0) ^ 1;
  return encode(bytes);
}
