# @dermoptera/handoff

Framework-free TypeScript for moving validated web-app state to another device
once. The sending browser encrypts state with AES-256-GCM. The decryption key and
claim token remain in the continuation URL fragment and are not sent to the
hosted transfer service.

```bash
npm install @dermoptera/handoff
```

```ts
import { createTransfer, claimTransfer } from "@dermoptera/handoff";

const config = {
  endpoint: "https://api.dermoptera.work",
  publishableKey: "pk_live_your_project_key",
  appId: "quote-wizard",
  schemaVersion: "v1",
};

const transfer = await createTransfer({
  ...config,
  state: { step: 2, answers: { size: "medium" } },
  continueUrl: "https://app.example/continue",
});

const incoming = await claimTransfer({
  ...config,
  validate: (value): value is { step: number; answers: { size: string } } => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const state = value as Record<string, unknown>;
    return Number.isInteger(state.step) && Boolean(state.answers) &&
      typeof state.answers === "object" && !Array.isArray(state.answers);
  },
});
```

Always validate incoming state before import. Ask before replacing meaningful
local state. Do not use this package for authentication/session transfer,
payments, banking, KYC, passwords, dedicated secret sharing, or safety-critical
workflows.

Documentation: <https://dermoptera.work/docs/>

License: MIT.
