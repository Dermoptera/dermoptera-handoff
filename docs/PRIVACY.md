# Privacy notice

Last updated: 2026-09-30

This notice describes the Free Developer Beta of Dermoptera Handoff. It does
not describe a paid service, advertising product or analytics product.

The initial Beta is an English Developer service operated from Japan without
country-specific advertising, sales or regional offers. Public availability is
not a representation that Dermoptera targets or has completed a regulatory
launch in every jurisdiction.

## Operator and contact

Dermoptera Handoff is operated from Japan by an individual using the Dermoptera
brand. The individual's legal name and serviceable address are held in a private
legal record and provided without delay upon a verified request to
`legal@dermoptera.work`. They are not routinely published in the repository,
npm package or Developer site. This request route is the formal contact for
operator-information, privacy, complaint and data-rights requests. Security
reports should be sent only to `security@dermoptera.work`.

No private email address, personal telephone number or home address should be
used as a public contact unless a specific legal obligation requires it.

Do not email live credentials, continuation URLs, AES keys or transferred
application state.

## Data handled for Developers

The service processes the following data to authenticate Developers, operate
Projects and the Dashboard, enforce security and quota, respond to requests and
maintain the Free Beta:

- email address and the authentication provider's subject identifier;
- Developer account ID, verification/status data and timestamps;
- Project name, ID, status, plan and quota;
- Allowed Origins;
- Project credential hash, non-secret prefix, status and timestamps;
- monthly create, successful-claim, expiry and error counters; and
- short-lived authentication, deletion and abuse-prevention records.

The raw publishable Project key is shown when created or rotated but only its
hash and a non-secret prefix are retained by the service. Authentication is
provided by Clerk. Dermoptera's application validates a short-lived Clerk
session token and stores the provider subject that links that identity to the
local Developer account.

## Data handled for transfer recipients

An end user does not need a Dermoptera account. The sending SDK encrypts the
Developer application's state in the browser with AES-256-GCM. The hosted
service receives ciphertext, IV, hashed claim material, Project association,
size and expiry metadata. The AES key stays in the continuation URL fragment
and is not intentionally sent to Dermoptera's backend.

The default transfer lifetime is ten minutes; Developers may configure one to
thirty minutes. A transfer permits one successful claim. Expired transfers are
rejected even if scheduled physical cleanup has not yet run. Ciphertext is
normally deleted immediately after a successful claim; if that best-effort
deletion fails, replay remains blocked and cleanup removes it after expiry.
Unclaimed ciphertext is removed after expiry. Hashed replay records remain
until the original expiry.

Client-side encryption limits what the hosted service can read. It does not
protect state from the Developer's own application, browser extensions,
compromised devices, screenshots, copied continuation URLs or systems outside
Dermoptera's control. Encrypted data may still be regulated data under
applicable law. Developers decide what their application transfers and remain
responsible for a lawful, narrow state schema and end-user notice.

## Security, rate-limit and service data

Rate-limit buckets use an HMAC over Project scope, a transient network address
and a time window. The database does not retain the raw network address in those
buckets. Aggregate event counters contain day, Project, event name and count;
they do not contain transferred state, a persistent end-user identifier or a
raw network address.

Application code is designed not to log plaintext state, AES keys, full claim
tokens, continuation fragments or request bodies. Cloudflare may process
ordinary request and security metadata at the platform layer under its service
terms and configured retention, even where Dermoptera disables account-visible
Worker invocation logs.

## Browser storage and cookies

The Developer Dashboard uses Clerk's strictly necessary browser storage and
cookies for email-code authentication, session continuity, bot protection and
logout. Dermoptera does not use advertising cookies or Google Analytics in the
initial Beta. A Developer's integrating application controls its own local
storage through its Application Adapter; Dermoptera does not copy that local
state except when the Developer explicitly creates an encrypted transfer.

## Service providers and international processing

Only providers needed for the initial service are named here:

- **Clerk** provides Developer authentication, email verification, session and
  bot-protection functions.
- **Cloudflare** provides DNS/CDN security functions, Workers execution and D1
  storage for the Developer service and encrypted transfers.

These providers may process data outside Japan according to their published
terms, data-processing terms, subprocessors and infrastructure locations.
Dermoptera reviews the applicable provider terms and configures access,
retention and logging proportionately before public signup. No advertising or
behavioral-analytics provider is part of the initial Beta.

## Retention and deletion

- Transfer ciphertext and replay records follow the short lifetimes described
  above.
- Rate-limit, authentication challenge and local-session records expire
  automatically.
- Developer account and Project records remain while the account/Project is
  active and are deleted through the self-service deletion flow, subject to
  technical completion and records that law requires Dermoptera to retain.
- A hashed Project/account deletion tombstone is retained for 30 days, then
  purged automatically.
- Aggregate Project usage is deleted when its Project is deleted.
- Provider-level security metadata follows the relevant provider configuration
  and terms.

## Access, correction, deletion and complaints

Developers can delete Projects and initiate account deletion in the Dashboard.
For access, disclosure, correction, addition, deletion, suspension of use,
erasure, suspension of third-party provision or a privacy complaint, email
`legal@dermoptera.work` from the account email where possible. State the request
and the account or Project to which it relates; never include a password,
Project key, continuation URL or transferred state.

Dermoptera may verify identity through the signed-in account, a fresh email
verification or limited information already associated with the account. It
will not request more information than reasonably needed. Requests are handled
within the time required by applicable law. The Free Beta charges no request
fee. If law permits a fee for an unusually burdensome disclosure, the amount and
reason will be explained before processing. A request may be limited or refused
where applicable law permits; the reason will be provided where required.

Account deletion is not a substitute for an unresolved legal or security
request. Minimal records may be retained where necessary to meet legal duties,
protect the service or document a completed request.

## Changes

Material changes are dated and published before they apply where practicable.
This notice does not limit rights that cannot be waived under applicable law.
