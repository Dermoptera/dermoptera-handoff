# Dermoptera Handoff 0.1.0-beta.1

Initial Limited Free Developer Beta release.

## What it does

Dermoptera Handoff moves validated web-app state to another device through a
short-lived, encrypted continuation URL. The sender encrypts in the browser,
the service stores ciphertext temporarily, and one receiver can claim,
validate, import and resume.

## Included

- `@dermoptera/handoff` framework-free TypeScript client;
- `@dermoptera/handoff-ui` optional QR and replace-confirmation helpers;
- Application Adapter interface and strict runtime validation flow;
- AES-256-GCM client-side encryption;
- one-time claim with a default ten-minute expiry;
- a framework-free quote-wizard example; and
- OpenAPI 3.1 and AI-readable implementation guidance.

## Free Beta

Each Project includes 500 successful claims per UTC calendar month. Creates,
expired links and rejected claims do not consume successful-claim quota. No
paid plan, SLA or enterprise support is available in this beta.

## Boundaries

Do not use this beta for authentication or session transfer, payments, banking,
KYC, passwords, dedicated secret sharing, continuous synchronization or
safety-critical workflows.

Security reports: `security@dermoptera.work`.
