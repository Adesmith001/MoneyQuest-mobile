const DATABASE_ID = '68cc891e001ebcafceeb';
const TABLE_ID = 'diagnostic_events';
const KEEP_DAYS = 30;

export const cutoffFor = now => new Date(now - KEEP_DAYS * 86400000).toISOString();

export function createHandler(request = fetch, now = Date.now) {
  return async ({ req, res, log, error }) => {
    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const key = req.headers?.['x-appwrite-key'];
    if (!endpoint || !project || !key) return res.json({ ok: false }, 503);
    const base = `${endpoint}/tablesdb/${DATABASE_ID}/tables/${TABLE_ID}/rows`;
    const headers = { 'x-appwrite-project': project, 'x-appwrite-key': key };
    const cutoff = cutoffFor(now());
    let removed = 0;
    try {
      for (let page = 0; page < 5; page++) {
        const params = new URLSearchParams();
        params.append('queries[]', JSON.stringify({ method: 'lessThan', attribute: 'occurredAt', values: [cutoff] }));
        params.append('queries[]', JSON.stringify({ method: 'limit', values: [100] }));
        const found = await request(`${base}?${params}`, { headers });
        if (!found.ok) throw new Error('list_failed');
        const { rows } = await found.json();
        if (!Array.isArray(rows) || rows.length === 0) break;
        for (const row of rows) {
          const deleted = await request(`${base}/${row.$id}`, { method: 'DELETE', headers });
          if (!deleted.ok) throw new Error('delete_failed');
          removed++;
        }
        if (rows.length < 100) break;
      }
      log(JSON.stringify({ event: 'diagnostic_retention', removed, cutoff }));
      return res.json({ ok: true, removed });
    } catch {
      error(JSON.stringify({ event: 'diagnostic_retention_failed', removed }));
      return res.json({ ok: false, removed }, 503);
    }
  };
}

export default createHandler();
