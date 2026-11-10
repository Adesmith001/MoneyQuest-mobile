# Error monitor

Receives bounded, sanitized incident envelopes from web, iOS, and Android.
The function writes to the private `diagnostic_events` table. It returns the
client `eventId` as `incidentId`; a retry with the same ID is accepted.

Function ID: `error-monitor`. Runtime: Node 22. Entrypoint: `src/main.js`.
Execution permission: `any` so signup and login failures can be submitted.
Function scope: `rows.write` only. Logging must be enabled.

Send a POST JSON envelope with a UUID `eventId`, ISO `occurredAt`, `supportCode`,
`flow`, `stage`, `action`, `severity`, `platform`, and `breadcrumbs` (up to 20).
Optional fields are documented in `src/main.js`. Body size is limited to 16 KB.
Action names are explicitly allowlisted there. Do not send credentials, email,
form values, purchase data, or arbitrary response bodies. Message and stack are
redacted again on the server. Function logs contain IDs and failure stages only.

The table has no user permissions. Create a separate, server-side read/update
credential for a future staff triage endpoint. There is no dashboard access yet.
Until the app is wired to submit incidents, only explicit test executions appear.
