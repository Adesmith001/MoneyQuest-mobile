const stages = new Set([
  'started', 'session_created', 'account_read', 'profile_read', 'succeeded', 'failed',
]);
const steps = new Set([
  'submit', 'session_request_sent', 'session_created', 'account_request_sent',
  'account_read', 'profile_request_sent', 'profile_read',
  'session_cleanup_started', 'session_cleanup_finished',
]);

const safeString = (value, pattern, maximum) =>
  typeof value === 'string' && value.length <= maximum && pattern.test(value) ? value : '';

export default async ({ req, res, log, error }) => {
  const rawBody = req.body;
  if (req.method !== 'POST' || (typeof rawBody === 'string' && rawBody.length > 4096)) {
    return res.json({ ok: false }, 400);
  }

  let body;
  try {
    body = req.bodyJson || (typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : rawBody);
  } catch {
    return res.json({ ok: false }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.json({ ok: false }, 400);
  }

  const attemptId = safeString(body.attemptId, /^[a-z0-9-]+$/i, 64);
  const supportCode = safeString(body.supportCode, /^[A-Z0-9-]+$/, 32);
  const kind = body.kind === 'started' || body.kind === 'finished' ? body.kind : '';
  const stage = stages.has(body.stage) ? body.stage : '';
  if (!attemptId || !supportCode || (!kind && !stage)) return res.json({ ok: false }, 400);

  // Build the log from an allowlist. Never log the request body, email,
  // password, session object, token, or raw exception message.
  const authStage = safeString(body.authStage, /^[a-z_]*$/, 32);
  const code = safeString(body.code, /^[a-z0-9_-]*$/i, 48);
  const type = safeString(body.type, /^[a-z0-9_-]*$/i, 64);
  const platform = safeString(body.platform, /^(web|ios|android)$/, 8);
  const durationMs = Number.isSafeInteger(body.durationMs) && body.durationMs >= 0
    ? Math.min(body.durationMs, 120000) : null;
  const occurredAt = safeString(body.occurredAt, /^[0-9TZ:.+-]+$/, 40);

  if (kind === 'started') {
    log(`Login started | attempt ${attemptId} | support ${supportCode} | ${platform} | ${occurredAt}`);
    return res.json({ ok: true });
  }

  if (kind === 'finished') {
    const outcome = body.outcome === 'succeeded' || body.outcome === 'failed' ? body.outcome : '';
    const timeline = Array.isArray(body.timeline) && body.timeline.length <= 12 ? body.timeline : null;
    if (!outcome || !timeline || timeline.some(item =>
      !item || !steps.has(item.step) || !Number.isSafeInteger(item.elapsedMs) ||
      item.elapsedMs < 0 || item.elapsedMs > 120000
    )) return res.json({ ok: false }, 400);

    log(`LOGIN ${outcome.toUpperCase()} | attempt ${attemptId} | support ${supportCode} | ${platform} | ${durationMs}ms`);
    log(JSON.stringify({
      attemptId, supportCode, platform, occurredAt, outcome, authStage, code, type, durationMs, timeline,
      appVersion: safeString(body.appVersion, /^[\w.\-]{1,32}$/, 32),
    }));
    timeline.forEach((item, index) => log(`${index + 1}. +${item.elapsedMs}ms ${item.step}`));
    if (outcome === 'failed') {
      const failedAt = authStage || (timeline.at(-1)?.step || 'unknown');
      log(`Failure | stage ${failedAt} | Appwrite code ${code || 'none'} | type ${type || 'none'}`);
      if (type === 'user_invalid_credentials') {
        log('Meaning: Appwrite rejected the email/password combination before creating a session. It does not reveal which field was incorrect. Check the account address and password with the user.');
      } else if (failedAt === 'client_validation') {
        log(`Meaning: the app stopped before contacting Appwrite because of ${code || 'invalid input'}. No session request was sent.`);
      } else if (code === '429') {
        log('Meaning: Appwrite rate limited the sign-in request. Check repeated attempts and the retry window before changing auth settings.');
      } else if (code === 'timeout') {
        log('Meaning: the app waited 15 seconds without a completed response at this stage. Check browser network requests and Appwrite availability.');
      } else if (failedAt === 'profile_read') {
        log('Meaning: Appwrite session creation succeeded, but the app could not load or prepare the user profile. Check profile database permissions and the matching user document.');
      } else if (failedAt === 'account_read') {
        log('Meaning: session creation succeeded, but the account read failed. Check session persistence and the account response.');
      } else {
        log('Meaning: inspect the last completed step and Appwrite code/type to locate the failing request.');
      }
      error(`Login failed | attempt ${attemptId} | ${failedAt} | ${code || 'no_code'} ${type || 'no_type'}`);
    } else {
      log('Meaning: session creation, account read, and profile read completed.');
    }
    return res.json({ ok: true });
  }

  // Keep older deployed app builds readable while they are replaced.
  const entry = { event: 'login_diagnostic', attemptId, supportCode, stage,
    authStage, code, type, platform, durationMs, occurredAt };
  (stage === 'failed' ? error : log)(JSON.stringify(entry));
  return res.json({ ok: true });
};
