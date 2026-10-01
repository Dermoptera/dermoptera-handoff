import { HandoffClient } from "./client.js";
import { FetchTransport } from "./transport.js";
import type { ClaimedState, JsonValue, Transfer } from "./types.js";

export interface BrowserSdkOptions {
  endpoint: string;
  publishableKey: string;
  appId: string;
  schemaVersion: string;
  fetcher?: typeof fetch;
}

function makeClient(options: BrowserSdkOptions): HandoffClient {
  const transportOptions = options.fetcher
    ? { endpoint: options.endpoint, publishableKey: options.publishableKey, fetcher: options.fetcher }
    : { endpoint: options.endpoint, publishableKey: options.publishableKey };
  return new HandoffClient({ appId: options.appId, schemaVersion: options.schemaVersion, transport: new FetchTransport(transportOptions) });
}

export function createTransfer<T extends JsonValue>(options: BrowserSdkOptions & { state: T; continueUrl: string; ttl?: number }): Promise<Transfer> {
  const client = makeClient(options);
  const createOptions = options.ttl === undefined ? { state: options.state, continueUrl: options.continueUrl } : { state: options.state, continueUrl: options.continueUrl, ttl: options.ttl };
  return client.create(createOptions);
}

export function claimTransfer<T extends JsonValue>(options: BrowserSdkOptions & { url?: string; validate: (state: JsonValue) => state is T; removeFragment?: boolean }): Promise<ClaimedState<T>> {
  const client = makeClient(options);
  return client.claim({
    ...(options.url === undefined ? {} : { url: options.url }),
    ...(options.removeFragment === undefined ? {} : { removeFragment: options.removeFragment }),
    expectedAppId: options.appId,
    expectedSchemaVersion: options.schemaVersion,
    validateIncomingState: options.validate,
  });
}
