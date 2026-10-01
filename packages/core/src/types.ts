export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface StateEnvelope<T extends JsonValue = JsonValue> {
  protocolVersion: 1;
  appId: string;
  schemaVersion: string;
  createdAt: number;
  state: T;
}

export interface CreateRequest {
  lookup: string;
  tokenHash: string;
  iv: string;
  ciphertext: string;
  ttl: number;
}

export interface CreateResponse {
  expiresAt: number;
}

export interface ClaimRequest {
  lookup: string;
  token: string;
}

export interface ClaimResponse {
  iv: string;
  ciphertext: string;
  expiresAt: number;
}

export interface Transport {
  create(request: CreateRequest): Promise<CreateResponse>;
  claim(request: ClaimRequest): Promise<ClaimResponse>;
  event?(name: "resume" | "error"): Promise<void>;
}

export interface CreateOptions<T extends JsonValue> {
  state: T;
  ttl?: number;
  continueUrl: string;
}

export interface Transfer {
  url: string;
  expiresAt: number;
}

export interface ClaimOptions<T extends JsonValue> {
  url?: string;
  expectedAppId: string;
  expectedSchemaVersion: string;
  validateIncomingState: (state: JsonValue) => state is T;
  removeFragment?: boolean;
}

export interface ClaimedState<T extends JsonValue> {
  state: T;
  appId: string;
  schemaVersion: string;
  createdAt: number;
  expiresAt: number;
}

export interface ApplicationAdapter<T extends JsonValue> {
  exportState(): T | Promise<T>;
  validateIncomingState(state: JsonValue): state is T;
  hasExistingState(): boolean | Promise<boolean>;
  confirmReplace(): boolean | Promise<boolean>;
  importState(state: T): void | Promise<void>;
  resume(): void | Promise<void>;
}

export interface ResumeOptions<T extends JsonValue> {
  adapter: ApplicationAdapter<T>;
  url?: string;
  removeFragment?: boolean;
}

export interface ResumeResult<T extends JsonValue> {
  status: "resumed" | "cancelled";
  claimed?: ClaimedState<T>;
}
