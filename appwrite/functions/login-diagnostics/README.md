# Login diagnostics

Each email/password login attempt calls this function for its start, Appwrite
session creation, account read, profile read, and final outcome. Find the runs
in Appwrite Console → Functions → login-diagnostics → Executions. Search the
logs by `attemptId` or the support code shown to the user. Execution logging
must stay enabled, and execute access must include `any` so pre-login requests
can reach it. No function API scopes or environment variables are needed.

The function records only validated diagnostic fields. It does not authenticate
the user or receive credentials. A missing execution means the client did not
reach the function; it cannot prove that no login attempt occurred. Function
logs are retained according to the Appwrite plan.
