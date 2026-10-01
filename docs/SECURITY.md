# Security architecture

Dermoptera Handoff uses client-side authenticated encryption for one-time state
transfer. It is not a security boundary for a compromised application or device.

## Flow

1. The sender generates independent random lookup, claim token, AES-256 key and
   96-bit IV with Web Crypto.
2. State is wrapped with protocol, app and schema identifiers, then encrypted by
   AES-GCM using lookup-bound additional authenticated data.
3. The service receives ciphertext, IV, token hash and expiry—not the AES key.
4. The continuation fragment holds lookup, raw claim token and AES key. Browsers
   do not include fragments in HTTP requests.
5. The receiver removes the fragment before prompts or network work, checks
   existing state, claims once, decrypts, verifies app/schema and calls the
   application's runtime validator before import.

## Service controls

- Conditional atomic claim and same-transaction usage increment.
- Claim-time expiry independent of cleanup.
- Exact Allowed Origin and rotatable publishable Project key.
- Project disable, UTC-month quota, payload limit and transient HMAC rate limits.
- `no-store`, `no-referrer`, `noindex`, `nosniff` response policy.
- Aggregate events without token, state, raw IP or persistent end-user ID.

## Application responsibilities

Allow only necessary fields, reject unknown fields, version schemas, confirm
before replacing local progress, avoid sensitive state unless appropriate for
the application's own risk model, and never load analytics before fragment
removal on the receive page.

## Disclosure

Email `security@dermoptera.work`. The mailbox is monitored through a tested
forwarding route. GitHub private vulnerability reporting will also be available
after repository publication. Do not send live credentials, real user state or
third-party personal data with a report.
