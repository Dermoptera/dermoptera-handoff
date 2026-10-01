# Dermoptera Handoff

Move structured web-app state to another device once, then resume at the same
step—without user accounts, user IDs, or permanent cloud state storage.

Dermoptera Handoff is an encrypted cross-device state transfer SDK for
multi-step forms, diagnostics, checklists, quote builders and configuration
wizards. The sending browser encrypts state. The hosted service temporarily
stores ciphertext, enforces expiry and permits one successful claim. The
decryption key remains in the URL fragment.

It is not authentication/session transfer, continuous sync, payment or banking
authorization, KYC, a password-sharing product, or safety-critical infrastructure.

## Quick path

1. Create a Developer account and Project.
2. Add your app's exact Allowed Origin.
3. Copy the Project's publishable browser key.
4. Install the SDK: `npm install @dermoptera/handoff`.
5. Create an encrypted continuation URL and claim it on the receiving page.

```ts
import { createTransfer, claimTransfer } from "@dermoptera/handoff";

const handoff = {
  endpoint: "https://api.dermoptera.work",
  publishableKey: "pk_live_your_project_key",
  appId: "quote-wizard",
  schemaVersion: "v1",
};

const transfer = await createTransfer({
  ...handoff,
  state: { step: 2, answers: { size: "medium" } },
  ttl: 600,
  continueUrl: "https://app.example/continue",
});

const incoming = await claimTransfer({
  ...handoff,
  validate: isQuoteState,
});
```

The publishable key is intentionally safe to include in browser code. It is a
Project identifier, not a secret. Exact Origin reduces browser misuse but can be
forged by non-browser clients; quota, Project-wide and per-IP rate limits,
monthly create limits, payload limits, credential rotation and Project
disablement provide the containment boundary.

## Packages and examples

- `@dermoptera/handoff`: dependency-free ESM TypeScript client.
- `@dermoptera/handoff-ui`: optional QR and replacement-prompt helpers.
- `examples/quote-wizard`: four-step framework-free example.
- `contracts/openapi.json`: OpenAPI 3.1 contract.

The hosted API and self-service Dashboard run at
<https://api.dermoptera.work> and <https://dermoptera.work/dashboard/>.

## Security model

- AES-256-GCM with a random 96-bit IV and 128-bit authentication tag.
- Independent 128-bit lookup, 256-bit claim token and 256-bit AES key.
- Claim token and AES key exist only in the URL fragment.
- Default TTL 10 minutes; accepted range 1–30 minutes.
- One conditional database update wins concurrent claims and meters usage.
- App ID, schema version and application runtime validation are mandatory.
- Existing state is never replaced without application-controlled consent.

Read [Quickstart](docs/QUICKSTART.md), [Architecture](docs/ARCHITECTURE.md),
[Privacy](docs/PRIVACY.md), [Terms](docs/TERMS.md), and [Security](SECURITY.md).

## Development

Node.js 22 or later is recommended for the workspace.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm pack:check
```

The hosted service and Developer Site are live as a Limited Free Developer Beta.
Public package releases are built from this audited source tree.

## License

MIT. The core SDK has no runtime dependency. Optional UI dependency notices are
kept with `packages/ui` and the release license inventory.
