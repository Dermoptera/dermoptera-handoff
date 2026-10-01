import { HandoffError } from "./errors.js";
import type { ClaimRequest, ClaimResponse, CreateRequest, CreateResponse, Transport } from "./types.js";

interface ApiErrorBody { error?: { code?: string; message?: string; retryable?: boolean } | string; }

const PUBLIC_CODES = new Set(["EXPIRED", "ALREADY_CLAIMED", "INVALID_TOKEN", "TRANSFER_UNAVAILABLE", "PAYLOAD_TOO_LARGE", "RATE_LIMITED", "QUOTA_EXCEEDED", "ORIGIN_NOT_ALLOWED", "PROJECT_DISABLED", "INVALID_CREDENTIAL"]);

export class FetchTransport implements Transport {
  readonly endpoint: string;
  readonly publishableKey: string;
  readonly fetcher: typeof fetch;

  constructor(options: { endpoint: string; publishableKey?: string; projectId?: string; fetcher?: typeof fetch }) {
    this.endpoint = options.endpoint.replace(/\/$/, "");
    this.publishableKey = options.publishableKey ?? options.projectId ?? "pk_local_poc";
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  create(request: CreateRequest): Promise<CreateResponse> {
    return this.post<CreateResponse>("/v1/transfers", request);
  }

  claim(request: ClaimRequest): Promise<ClaimResponse> {
    return this.post<ClaimResponse>("/v1/claims", request);
  }

  async event(name: "resume" | "error"): Promise<void> {
    await this.post<Record<string, never>>("/v1/events", { name });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(this.endpoint + path, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json", "X-Publishable-Key": this.publishableKey },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      throw new HandoffError("NETWORK_ERROR", "The handoff service is unreachable.", { retryable: true, cause });
    }
    let parsed: unknown;
    try { parsed = await response.json(); } catch (cause) {
      throw new HandoffError("INVALID_RESPONSE", "The handoff service returned invalid JSON.", { status: response.status, cause });
    }
    if (!response.ok) {
      const error = (parsed && typeof parsed === "object" && "error" in parsed) ? (parsed as ApiErrorBody).error : undefined;
      const candidate = typeof error === "string" ? error : error?.code;
      const code = candidate && PUBLIC_CODES.has(candidate) ? candidate : "NETWORK_ERROR";
      const message = typeof error === "object" && typeof error?.message === "string" ? error.message : "The handoff request was rejected.";
      throw new HandoffError(code as "TRANSFER_UNAVAILABLE" | "PAYLOAD_TOO_LARGE" | "RATE_LIMITED" | "QUOTA_EXCEEDED" | "ORIGIN_NOT_ALLOWED" | "PROJECT_DISABLED" | "INVALID_CREDENTIAL" | "EXPIRED" | "ALREADY_CLAIMED" | "INVALID_TOKEN" | "NETWORK_ERROR", message, {
        status: response.status,
        retryable: response.status === 429 || response.status >= 500,
      });
    }
    return parsed as T;
  }
}
