# AI coding-agent implementation guide

Use this product only to move small, structured, JSON-compatible application
state between devices once. Do not use it for authentication, sessions, secrets,
payments, banking, KYC or continuous synchronization.

Required implementation sequence:

1. Define a minimal allowlisted state type and strict runtime validator.
2. Configure stable lowercase `appId`, explicit `schemaVersion`, exact Allowed
   Origin and public Project key.
3. Create with HTTPS `continueUrl`; render the returned URL as QR or link.
4. On the receive route, load no third party before the SDK removes the fragment.
5. Detect meaningful existing state and ask Replace or Cancel before claim.
6. Claim once, decrypt, verify app/schema, validate, import and resume.
7. Handle stable error codes without logging the URL, fragment, key or state.

Do not invent endpoint names or bypass runtime validation. Use
`contracts/openapi.json` for HTTP details and `ApplicationAdapter<T>` for state
integration. Default TTL is 600 seconds; supported range is 60–1,800 seconds.
