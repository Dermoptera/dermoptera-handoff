# Pricing hypothesis

Billing unit: one successful claim. Create, expiry, invalid token and duplicate
claim do not consume claim quota. Quota resets on the UTC calendar month.

| Plan | Price | Included successful claims | Availability |
|---|---:|---:|---|
| Free | $0 | 500/month | Initial release |
| Developer | $9/month | 5,000/month | Coming soon |
| Production | $29/month | 50,000/month | Coming soon |

No overage billing is enabled. A Project returns `QUOTA_EXCEEDED` at its limit.
The initial prices remain unchanged: measured Cloudflare performance was adequate
and estimated infrastructure cost is small relative to the proposed paid tiers.
Pricing does not include an SLA, enterprise sales, bespoke integration or support.
