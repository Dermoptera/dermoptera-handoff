# Architecture and protocol

`@dermoptera/handoff` owns JSON safety, Web Crypto, fragment encoding, transport,
stable errors, app/schema matching, and adapter orchestration. It has no runtime
dependency. `ApplicationAdapter<T>` owns state export, runtime validation,
existing-state detection, replace/cancel consent, import, and resume. `@dermoptera/handoff-ui`
is optional and supplies QR and replacement-prompt helpers.

The Worker stores ciphertext temporarily, applies TTL, Project quota, exact
Origin and transient network limits, performs the one-time claim, and records
aggregate usage. It never decrypts application state. Developer account,
Project and credential records are separate from anonymous end users.

## Fragment and plaintext

The unpadded base64url fragment is
`#hfx1.<16-byte lookup>.<32-byte claim token>.<32-byte AES key>`. The 12-byte IV
travels with ciphertext. AES-GCM AAD is `handoff-state|v1|<lookup>`. Token and
key are generated independently with Web Crypto. The fragment never enters an
HTTP request and is removed before prompts or claim traffic.

Plaintext contains only protocol version, app ID, schema version, creation time,
and developer state. The SDK rejects unknown envelope fields, non-JSON values,
non-finite numbers, non-plain prototypes, `__proto__`/`prototype`/`constructor`,
nesting over 32, and plaintext over 32 KiB. Decrypted state must then pass exact
app/schema matching and the application's runtime validator.

## Product API and atomic claim

`POST /v1/transfers` accepts lookup, SHA-256 token hash, IV, ciphertext and TTL.
`POST /v1/transfers/claim` accepts lookup and the raw claim token. Both require a
rotatable publishable Project key (explicitly not a secret) and an allowed Origin.

Claim is one conditional `UPDATE ... RETURNING` that checks unclaimed, unexpired,
active Project and remaining UTC-month quota. An `AFTER UPDATE` trigger increments
successful claims in that same transaction. Failed claims therefore consume no
quota and a successful claim cannot miss metering. Ciphertext is then deleted;
only lookup/token hashes remain until original expiry to report an already-used
link. If the post-claim deletion batch fails, the already-claimed ciphertext
remains replay-protected and is removed by expiry cleanup. Cleanup is not trusted
for expiry correctness.

## Limits and operations

- TTL: minimum 60, default 600, maximum 1,800 seconds.
- Plaintext: 32,768 bytes; ciphertext: 32,784 bytes including GCM tag.
- Ten-minute per-IP limits: create 30, claim 90, event 120, auth-link request 10.
- Ten-minute Project-wide limits: create 60, claim 180, event 240.
- Network buckets: HMAC(Project scope, transient IP or Project-wide marker,
  window); raw IP is not stored.
- Free quota: 500 successful claims per UTC calendar month.
- Free Beta abuse limits: at most three Projects per account and at most three
  creates per successful-claim allowance each UTC month. Creates still do not
  consume successful-claim quota.
- `CREATE_ENABLED=false` stops new transfers globally while allowing existing
  claims. Project disable stops both routes for that Project.

Production configuration runs expiry cleanup every five minutes and disables
account-visible Worker observability. Claim-time expiry remains authoritative,
so cleanup delay never makes expired state claimable.

Allowed Origin and the publishable Project key are abuse controls, not strong
authentication: non-browser clients can forge `Origin`. Project rotation,
disablement, quota, rate limits, payload limits and short TTL provide the actual
containment boundary.

All responses use no-store/no-cache/noindex/no-referrer/nosniff headers. Detailed
expired/already-used errors require both lookup and token; arbitrary guesses get
`INVALID_TOKEN`. Monthly usage has no end-user ID, state, IP, or full User-Agent.

## Verified cloud behavior

An isolated real Cloudflare D1 test produced exactly one success under both 32
and 64 concurrent claims, with exactly one usage increment. Quota, credential,
Origin, IDOR, TTL, rate and staged load tests passed. The test Worker and D1 were
deleted afterward. Production create, claim, decrypt, runtime validation,
replay rejection and bounded rate-limit behavior were subsequently verified.
