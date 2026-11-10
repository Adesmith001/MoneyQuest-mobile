const stages = new Set([
  'started', 'session_created', 'account_read', 'profile_read', 'succeeded', 'failed',
]);

const safeString = (value, pattern, maximum) =>
  typeof value === 'string' && value.length <= maximum && pattern.test(value) ? value : '';

export default async ({ req, res, log, error }) => {
  const rawBody = req.body;
  if (req.method !== 'POST' || (typeof rawBody === 'string' && rawBody.length > 2048)) {
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
  const stage = stages.has(body.stage) ? body.stage : '';
  if (!attemptId || !supportCode || !stage) return res.json({ ok: false }, 400);

  // Build the log from an allowlist. Never log the request body, email,
  // password, session object, token, or raw exception message.
  const entry = {
    event: 'login_diagnostic',
    attemptId,
    supportCode,
    stage,
    authStage: safeString(body.authStage, /^[a-z_]*$/, 32),
    code: safeString(body.code, /^[a-z0-9_-]*$/i, 48),
    type: safeString(body.type, /^[a-z0-9_-]*$/i, 64),
    platform: safeString(body.platform, /^(web|ios|android)$/, 8),
    durationMs: Number.isSafeInteger(body.durationMs) && body.durationMs >= 0
      ? Math.min(body.durationMs, 120000) : null,
    occurredAt: safeString(body.occurredAt, /^[0-9TZ:.+-]+$/, 40),
  };
  (stage === 'failed' ? error : log)(JSON.stringify(entry));
  return res.json({ ok: true });
};
