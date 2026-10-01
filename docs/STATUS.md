# Service status design

The first status page is a static page that performs an explicit, user-triggered
read of `GET /healthz`. It reports API reachability and response time without
creating a transfer or consuming quota. It does not claim historical uptime.

No external status SaaS or always-on human monitoring is required initially.
Cloudflare platform alerts and a synthetic health check may be added only after
their privacy, notification and maintenance costs are reviewed.

States: **Operational**, **Degraded**, **Unavailable**, and **Not checked**.
Incident history is omitted until there is a reliable automated source.
