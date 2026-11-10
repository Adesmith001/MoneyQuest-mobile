# Login diagnostics

Each email/password login attempt sends a start execution and a final execution.
The final execution contains the ordered timeline, Appwrite status/type, and a
plain-language interpretation. Find it in Appwrite Console → Functions →
login-diagnostics → Executions. Match the two executions by attempt ID or the
support code shown to the user. A start without a final execution suggests
the app closed or lost connectivity before it could report the result. Logging
must stay enabled, and execute access must include `any` so pre-login requests
can reach it. No function API scopes or environment variables are needed.

The function records only validated diagnostic fields. It does not authenticate
the user or receive passwords or session credentials. It records the submitted
email and whether a password was entered so the account address can be checked.
Appwrite's Body panel stays empty by design; the sanitized diagnostic body is
written in the Logs tab. A missing execution means the client did not
reach the function; it cannot prove that no login attempt occurred. Function
logs are retained according to the Appwrite plan.
