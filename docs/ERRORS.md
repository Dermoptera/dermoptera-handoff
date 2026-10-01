# Error reference

| Code | Meaning | Developer action |
|---|---|---|
| `INVALID_FRAGMENT` | Missing or malformed continuation fragment | Ask the user to scan a newly created QR |
| `INVALID_STATE` | Authentication, JSON or runtime validation failed | Do not import; inspect schema/validator |
| `APP_MISMATCH` | Different application ID | Use the intended application |
| `SCHEMA_MISMATCH` | Unsupported state schema | Add an explicit migration or create a new transfer |
| `EXPIRED` | TTL elapsed | Create a new transfer |
| `ALREADY_CLAIMED` | One-time URL was already used | Create a new transfer |
| `INVALID_TOKEN` | Transfer cannot be matched | Do not reveal lookup detail; create a new transfer |
| `ORIGIN_NOT_ALLOWED` | Browser Origin is not allowlisted | Add the exact Origin in Dashboard |
| `INVALID_CREDENTIAL` | Project key is invalid or rotated | Replace it with the current publishable key |
| `PROJECT_DISABLED` | Project is disabled | Re-enable only after reviewing the reason |
| `PAYLOAD_TOO_LARGE` | State exceeds the limit | Send fewer allowlisted fields |
| `RATE_LIMITED` | Short-window or monthly create safety limit reached | Honor `Retry-After` when present; inspect Project usage; avoid automatic loops |
| `QUOTA_EXCEEDED` | UTC-month successful-claim limit reached | Check usage; paid plans are not yet available |
| `CRYPTO_UNAVAILABLE` | Web Crypto is unavailable | Require a supported secure browser context |
| `STORAGE_UNAVAILABLE` | Application import failed | Preserve existing state and explain local storage failure |
| `NETWORK_ERROR` | Service could not be reached | Offer a bounded retry; never log the continuation URL |

Only `429` and server errors are generally retryable. Never retry a claim in a
way that could import twice; the application must treat a lost successful claim
response as consumed.
