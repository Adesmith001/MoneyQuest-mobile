const DASHBOARD_PROJECT_ID = '691a7162000351b16b2a';
const DATABASE_ID = '68cc891e001ebcafceeb';
const TABLE_ID = 'diagnostic_events';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPORT = /^[A-Z0-9-]{1,32}$/;
const statuses = new Set(['new', 'investigating', 'resolved', 'ignored']);

export function createHandler(request = fetch) {
  return async ({ req, res, log, error }) => {
    if (req.method !== 'POST') return res.json({ ok: false }, 405);
    const raw = typeof req.bodyText === 'string' ? req.bodyText :
      typeof req.body === 'string' ? req.body : JSON.stringify(req.bodyJson ?? req.body ?? {});
    if (Buffer.byteLength(raw, 'utf8') > 4096) return res.json({ ok: false }, 413);
    let body;
    try { body = req.bodyJson ?? JSON.parse(raw); } catch { return res.json({ ok: false }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.jwt !== 'string' || body.jwt.length < 30 || body.jwt.length > 4096) {
      return res.json({ ok: false }, 400);
    }
    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const key = req.headers?.['x-appwrite-key'];
    if (!endpoint || !project || !key) return res.json({ ok: false }, 503);
    try {
      const identity = await request(`${endpoint}/account`, {
        headers: { 'x-appwrite-project': DASHBOARD_PROJECT_ID, 'x-appwrite-jwt': body.jwt },
      });
      if (!identity.ok) return res.json({ ok: false, error: 'forbidden' }, 403);
      const user = await identity.json();
      const labels = Array.isArray(user.labels) ? user.labels.map(value => String(value).toLowerCase()) : [];
      if (!labels.includes('admin') && !labels.includes('ceo')) {
        return res.json({ ok: false, error: 'forbidden' }, 403);
      }

      const base = `${endpoint}/tablesdb/${DATABASE_ID}/tables/${TABLE_ID}/rows`;
      const headers = { 'x-appwrite-project': project, 'x-appwrite-key': key, 'content-type': 'application/json' };
      let url = base;
      let options = { method: 'GET', headers };
      if (body.action === 'list') {
        if (body.supportCode !== undefined && !SUPPORT.test(body.supportCode)) return res.json({ ok: false }, 400);
        const offset = body.offset ?? 0;
        if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) return res.json({ ok: false }, 400);
        const params = new URLSearchParams();
        if (body.supportCode) params.append('queries[]', JSON.stringify({ method: 'equal', attribute: 'supportCode', values: [body.supportCode] }));
        params.append('queries[]', JSON.stringify({ method: 'orderDesc', attribute: 'occurredAt' }));
        params.append('queries[]', JSON.stringify({ method: 'limit', values: [25] }));
        params.append('queries[]', JSON.stringify({ method: 'offset', values: [offset] }));
        url += `?${params}`;
      } else if (body.action === 'get' || body.action === 'update') {
        if (typeof body.incidentId !== 'string' || !UUID.test(body.incidentId)) return res.json({ ok: false }, 400);
        url += `/${body.incidentId}`;
        if (body.action === 'update') {
          if (!statuses.has(body.triageStatus)) return res.json({ ok: false }, 400);
          options = { method: 'PATCH', headers, body: JSON.stringify({ data: { triageStatus: body.triageStatus } }) };
        }
      } else return res.json({ ok: false }, 400);

      const result = await request(url, options);
      if (!result.ok) {
        error(JSON.stringify({ event: 'triage_storage_failed', statusCode: result.status }));
        return res.json({ ok: false }, result.status === 404 ? 404 : 503);
      }
      const data = await result.json();
      log(JSON.stringify({ event: 'triage_access', action: body.action, staffUserId: user.$id }));
      if (body.action === 'list') return res.json({ ok: true, total: data.total,
        incidents: data.rows.map(row => ({ ...row, ...(row.data || {}), id: row.$id })) });
      return res.json({ ok: true, incident: { ...data, ...(data.data || {}), id: data.$id } });
    } catch {
      return res.json({ ok: false, error: 'service_unavailable' }, 503);
    }
  };
}

export default createHandler();
