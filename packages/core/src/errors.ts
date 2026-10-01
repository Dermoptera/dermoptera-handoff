export type HandoffErrorCode =
  | "EXPIRED"
  | "ALREADY_CLAIMED"
  | "INVALID_TOKEN"
  | "TRANSFER_UNAVAILABLE"
  | "INVALID_STATE"
  | "APP_MISMATCH"
  | "SCHEMA_MISMATCH"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "ORIGIN_NOT_ALLOWED"
  | "PROJECT_DISABLED"
  | "INVALID_CREDENTIAL"
  | "CRYPTO_UNAVAILABLE"
  | "STORAGE_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "INVALID_FRAGMENT"
  | "INVALID_RESPONSE"
  | "CANCELLED";

export const END_USER_MESSAGES: Readonly<Partial<Record<HandoffErrorCode, string>>> = {
  EXPIRED: "This transfer link has expired.",
  ALREADY_CLAIMED: "This transfer link has already been used.",
  INVALID_TOKEN: "This transfer link is not valid.",
  TRANSFER_UNAVAILABLE: "This transfer is unavailable or has already been used.",
  INVALID_STATE: "The transferred state could not be verified.",
  APP_MISMATCH: "This transfer belongs to a different application.",
  SCHEMA_MISMATCH: "This transfer was created by an incompatible app version.",
  QUOTA_EXCEEDED: "Transfers are temporarily unavailable for this application.",
  ORIGIN_NOT_ALLOWED: "Transfers are not enabled on this site.",
  PROJECT_DISABLED: "Transfers are currently disabled for this application.",
  CRYPTO_UNAVAILABLE: "Secure transfer is unavailable in this browser.",
  NETWORK_ERROR: "The transfer service could not be reached. Please try again.",
};

export function endUserMessage(error: HandoffError): string {
  return END_USER_MESSAGES[error.code] ?? "The transfer could not be completed.";
}

export class HandoffError extends Error {
  readonly code: HandoffErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(code: HandoffErrorCode, message: string, options: { retryable?: boolean; status?: number; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "HandoffError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    if (options.status !== undefined) this.status = options.status;
  }
}

export function normalizeError(error: unknown): HandoffError {
  if (error instanceof HandoffError) return error;
  if (error instanceof DOMException && (error.name === "OperationError" || error.name === "DataError")) {
    return new HandoffError("INVALID_STATE", "The encrypted state could not be authenticated or decoded.", { cause: error });
  }
  return new HandoffError("NETWORK_ERROR", "The handoff request failed.", { retryable: true, cause: error });
}
