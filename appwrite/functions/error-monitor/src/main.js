import { createHash } from 'node:crypto';

const DATABASE_ID = '68cc891e001ebcafceeb';
const TABLE_ID = 'diagnostic_events';
const MAX_BODY_BYTES = 16 * 1024;
const flows = new Set(['startup', 'signup', 'login', 'onboarding', 'lesson', 'progress', 'purchase', 'account']);
const severities = new Set(['warning', 'error', 'fatal']);
const platforms = new Set(['web', 'ios', 'android']);
const actions = new Set([
  'app_started', 'screen_opened', 'signup_opened', 'signup_submitted', 'signup_failed',
  'login_opened', 'login_submitted', 'login_failed', 'oauth_started', 'oauth_callback',
  'session_restore_started', 'session_restore_failed', 'onboarding_step_started',
  'onboarding_step_completed', 'lesson_started', 'lesson_completed',
  'progress_save_started', 'progress_save_failed', 'checkout_started',
  'checkout_failed', 'purchase_restore_started', 'purchase_restore_failed',
  'entitlement_sync_failed', 'signout_started', 'signout_failed',
  'request_started', 'request_failed', 'render_failed', 'unhandled_error',
]);
const keys = new Set([
  'eventId', 'occurredAt', 'supportCode', 'anonymousId', 'sessionId', 'userId',
  'flow', 'stage', 'screen', 'action', 'severity', 'errorType', 'statusCode',
  'requestId', 'message', 'stack', 'releaseId', 'platform', 'deviceClass', 'breadcrumbs',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTIFIER = /^[a-z0-9_.:-]+$/i;
const SUPPORT = /^[A-Z0-9-]+$/;
const SAFE_LABEL = /^[a-z0-9_.:-]+$/i;

function field(value, max, pattern = SAFE_LABEL, required = false) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error('invalid_envelope');
    return '';
  }
  if (typeof value !== 'string' || value.length > max || !pattern.test(value)) {
    throw new Error('invalid_envelope');
  }
  return value;
}

function safeText(value, max) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > max) throw new Error('invalid_envelope');
  return value
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\bBearer\s+\S+/gi, '[credential]')
    .replace(/\b(?:password|passwd|token|secret|cookie|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '[credential]')
    .slice(0, max);
}

export function validateIncident(body, receivedAt = new Date().toISOString()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_envelope');
  if (Object.keys(body).some(key => !keys.has(key))) throw new Error('invalid_envelope');
  const eventId = field(body.eventId, 36, UUID, true);
  const occurredAt = field(body.occurredAt, 40, /^[0-9TZ:.+-]+$/, true);
  if (!Number.isFinite(Date.parse(occurredAt))) throw new Error('invalid_envelope');
  const flow = field(body.flow, 24, SAFE_LABEL, true);
  const action = field(body.action, 48, SAFE_LABEL, true);
  const severity = field(body.severity, 12, SAFE_LABEL, true);
  const platform = field(body.platform, 12, SAFE_LABEL, true);
  if (!flows.has(flow) || !actions.has(action) || !severities.has(severity) || !platforms.has(platform)) {
    throw new Error('invalid_envelope');
  }
  if (!Array.isArray(body.breadcrumbs) || body.breadcrumbs.length > 20) throw new Error('invalid_envelope');
  const breadcrumbs = body.breadcrumbs.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        Object.keys(item).some(key => !['action', 'elapsedMs', 'screen'].includes(key))) throw new Error('invalid_envelope');
    const step = field(item.action, 48, SAFE_LABEL, true);
    if (!actions.has(step) || !Number.isSafeInteger(item.elapsedMs) || item.elapsedMs < 0 || item.elapsedMs > 86400000) {
      throw new Error('invalid_envelope');
    }
    return { action: step, elapsedMs: item.elapsedMs,
      ...(item.screen ? { screen: field(item.screen, 80) } : {}) };
  });
  const stage = field(body.stage, 64, SAFE_LABEL, true);
  const errorType = field(body.errorType, 80);
  const stack = safeText(body.stack, 2048);
  const topFrame = stack.split('\n').find(line => line.includes(' at ')) || '';
  const fingerprint = createHash('sha256').update([flow, stage, errorType, topFrame].join('|')).digest('hex').slice(0, 32);
  const statusCode = body.statusCode === undefined || body.statusCode === null ? null : body.statusCode;
  if (statusCode !== null && (!Number.isSafeInteger(statusCode) || statusCode < 0 || statusCode > 599)) throw new Error('invalid_envelope');
  return {
    eventId,
    row: {
      occurredAt, receivedAt,
      supportCode: field(body.supportCode, 32, SUPPORT, true),
      anonymousId: field(body.anonymousId, 80, IDENTIFIER),
      sessionId: field(body.sessionId, 80, IDENTIFIER),
      verifiedUserId: '', // Client userId is advisory and never trusted here.
      flow, stage, screen: field(body.screen, 80), action, severity,
      errorType, statusCode, requestId: field(body.requestId, 80),
      fingerprint, releaseId: field(body.releaseId, 80), platform,
      deviceClass: field(body.deviceClass, 40), message: safeText(body.message, 1024),
      stack, breadcrumbsJson: JSON.stringify(breadcrumbs), triageStatus: 'new',
    },
  };
}

export function createHandler(createRow = async (id, row, key) => {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  if (!endpoint || !project || !key) throw new Error('function_configuration_missing');
  const response = await fetch(`${endpoint}/tablesdb/${DATABASE_ID}/tables/${TABLE_ID}/rows`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-appwrite-project': project, 'x-appwrite-key': key },
    body: JSON.stringify({ rowId: id, data: row }),
  });
  if (!response.ok) {
    const failure = new Error('storage_write_failed');
    failure.statusCode = response.status;
    throw failure;
  }
}) {
  return async ({ req, res, log, error }) => {
    if (req.method !== 'POST') return res.json({ ok: false, error: 'method_not_allowed' }, 405);
    const raw = typeof req.bodyText === 'string' ? req.bodyText :
      typeof req.body === 'string' ? req.body : JSON.stringify(req.bodyJson ?? req.body ?? {});
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return res.json({ ok: false, error: 'invalid_envelope' }, 413);
    let incident;
    try {
      incident = validateIncident(req.bodyJson ?? JSON.parse(raw));
    } catch {
      return res.json({ ok: false, error: 'invalid_envelope' }, 400);
    }
    const { eventId, row } = incident;
    try {
      await createRow(eventId, row, req.headers?.['x-appwrite-key']);
      log(JSON.stringify({ event: 'incident_saved', eventId, supportCode: row.supportCode,
        flow: row.flow, stage: row.stage, severity: row.severity, fingerprint: row.fingerprint }));
      return res.json({ ok: true, incidentId: eventId }, 201);
    } catch (failure) {
      if (failure.statusCode === 409) {
        log(JSON.stringify({ event: 'incident_duplicate', eventId, supportCode: row.supportCode }));
        return res.json({ ok: true, incidentId: eventId }, 200);
      }
      error(JSON.stringify({ event: 'incident_storage_failed', eventId, statusCode: failure.statusCode || 0 }));
      return res.json({ ok: false, error: 'storage_unavailable' }, 503);
    }
  };
}

export default createHandler();
