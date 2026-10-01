# Quickstart: first successful state transfer

The hosted endpoint is live as a Limited Free Developer Beta. Create a free
Developer account and Project before installing the SDK.

## 1. Create the Project

Sign in to the Dashboard with email verification code, choose **Create Project**,
add the exact HTTPS Origin of your web app, and copy the one-time-displayed
publishable Project key. A publishable key starts with `pk_live_`; it is expected
to appear in browser code and is not a secret.

## 2. Install

```bash
npm install @dermoptera/handoff
```

Optional QR rendering:

```bash
npm install @dermoptera/handoff-ui
```

## 3. Define and validate your state

```ts
import type { JsonValue } from "@dermoptera/handoff";

type QuoteState = {
  step: number;
  projectType: string;
  area: number | null;
};

export function isQuoteState(value: JsonValue): value is QuoteState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, JsonValue>;
  return Object.keys(state).every((key) => ["step", "projectType", "area"].includes(key)) &&
    Number.isInteger(state.step) && Number(state.step) >= 1 && Number(state.step) <= 4 &&
    typeof state.projectType === "string" && state.projectType.length <= 40 &&
    (state.area === null || (typeof state.area === "number" && state.area >= 1 && state.area <= 500));
}
```

Do not use `as QuoteState` in place of runtime validation. Reject unknown fields.

## 4. Create the continuation URL

```ts
import { createTransfer } from "@dermoptera/handoff";
import { renderQrToCanvas } from "@dermoptera/handoff-ui";

const config = {
  endpoint: "https://api.dermoptera.work",
  publishableKey: "pk_live_your_project_key",
  appId: "quote-wizard",
  schemaVersion: "v1",
};

const transfer = await createTransfer({
  ...config,
  state: { step: 2, projectType: "Garden office", area: 18 },
  ttl: 600,
  continueUrl: "https://app.example/continue",
});

await renderQrToCanvas(document.querySelector("#handoff-qr")!, transfer.url);
```

The SDK encrypts before network access. Send the continuation URL as a QR code or
link. Do not copy it into analytics, logs, error reporting or support messages.

## 5. Claim, validate, import and resume

Run this on the continuation page before loading analytics or third-party code:

```ts
import { FetchTransport, HandoffClient, HandoffError } from "@dermoptera/handoff";
import { isQuoteState } from "./quote-state";

const client = new HandoffClient({
  appId: config.appId,
  schemaVersion: config.schemaVersion,
  transport: new FetchTransport(config),
});

try {
  await client.claimAndResume({ adapter: {
    exportState: () => JSON.parse(localStorage.getItem("quote:v1") ?? "null"),
    validateIncomingState: isQuoteState,
    hasExistingState: () => localStorage.getItem("quote:v1") !== null,
    confirmReplace: () => confirm("This device already has progress. Replace it?"),
    importState: (state) => localStorage.setItem("quote:v1", JSON.stringify(state)),
    resume: () => {
      const state = JSON.parse(localStorage.getItem("quote:v1")!) as { step: number };
      location.replace(`/quote?step=${state.step}`);
    },
  }});
} catch (error) {
  const code = error instanceof HandoffError ? error.code : "UNKNOWN";
  document.querySelector("#handoff-error")!.textContent = `Transfer failed: ${code}`;
}
```

`claimAndResume()` removes the fragment, detects existing state, confirms replace,
claims once, decrypts, validates, imports and resumes—in that order.

## Expected result

The receiving device resumes at step 2. A second use of the same URL returns
`ALREADY_CLAIMED`. An unused URL expires after ten minutes by default. Successful
claims count toward the Project's UTC-month quota; creates and rejected claims do
not.

## Common failures

- `ORIGIN_NOT_ALLOWED`: copy the browser's exact Origin into Project settings.
- `INVALID_CREDENTIAL`: replace a rotated or mistyped publishable key.
- `APP_MISMATCH` / `SCHEMA_MISMATCH`: use the same app ID and compatible schema.
- `INVALID_STATE`: fix the runtime validator or do not import the payload.
- `EXPIRED` / `ALREADY_CLAIMED`: create a new transfer.
- `RATE_LIMITED`: wait for `Retry-After`; do not loop automatically.
- `QUOTA_EXCEEDED`: inspect UTC-month usage in Dashboard.
