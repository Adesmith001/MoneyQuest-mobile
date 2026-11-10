# Error monitor runbook

## What is live

The Money-quest Appwrite project has three diagnostic Functions:

- `error-monitor` accepts incident envelopes from web, iOS, and Android, including guests.
- `diagnostic-triage` verifies a short-lived JWT from the MoneyQuest_Dashboard
  project and checks the Auth `admin` or `ceo` label before reading or updating
  the private table.
- `diagnostic-retention` runs daily at 03:00 UTC and removes incidents older
  than 30 days (up to 500 per run).

Incidents are stored in `diagnostic_events` in database
`68cc891e001ebcafceeb`. The table and rows have no browser permissions.
The public ingestion Function has `rows.write`; the staff and retention
Functions have `rows.read` and `rows.write`. Function logs contain incident
IDs, support codes, stages, and storage errors, not request bodies or JWTs.

## Find an incident

1. Ask the user for the support code shown in the app.
2. Sign into the MoneyQuest dashboard with an Auth account carrying the
   `admin` or `ceo` label and open **Diagnostics**.
3. Search the support code. Open a result to inspect its ordered actions,
   screen names, failing stage, error type, status, release, and stack.
4. Mark it `investigating`, `resolved`, or `ignored` when appropriate.

The dashboard uses its own Appwrite project for authentication and the
Money-quest project to invoke `diagnostic-triage`. Confirm its deployed
`VITE_APPWRITE_PROJECT_ID` points to the dashboard project and
`VITE_APPWRITE_ANALYTICS_PROJECT_ID` points to Money-quest.

## Troubleshooting

- No incident row: check the `error-monitor` execution status and response.
  A `400` means the envelope was rejected; a `503` means the write failed.
- No execution: check the app release, connectivity, and whether the report is
  queued locally. The client retries on app launch, app resume, and web online.
- Dashboard `403`: check the signed-in dashboard account's server-managed Auth
  labels. User-editable preferences do not grant access.
- One event ID sent again returns `200` and does not make a second row.
- A hard native crash or a failure before the JavaScript bundle loads may not
  be delivered. This monitor is not a native crash recorder or session replay.

The old `login-diagnostics` Function remains available during the rollout.
Expected invalid credentials appear as a warning in the new monitor so they
can be traced without treating them as app crashes.
