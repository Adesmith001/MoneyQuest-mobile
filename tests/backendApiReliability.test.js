const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/services/backendApi.ts'), 'utf8');
assert.match(source, /const JWT_TIMEOUT_MS = 2000;/, 'JWT lookup has a short fallback deadline');
assert.match(source, /getRequestJwt/, 'API requests use the bounded JWT lookup');
assert.match(source, /jwtTimedOut/, 'a stuck JWT lookup is discarded after its deadline');
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

const fetchCalls = [];
let jwtCalls = 0;
let nextResponse = null;

global.fetch = async (url, options = {}) => {
  fetchCalls.push({ url, options });
  if (nextResponse) {
    const response = nextResponse;
    nextResponse = null;
    return response;
  }
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => null },
    json: async () => url.endsWith('/sections') ? { sections: [] } : { levels: [] },
  };
};

const mocks = {
  '../config/environment': { ENV: { MONEYQUEST_API_BASE_URL: 'https://api.example.test' } },
  './appwrite': {
    account: {
      createJWT: async () => {
        jwtCalls += 1;
        return { jwt: 'verified-appwrite-jwt' };
      },
    },
  },
  './errorMonitor': { recordBreadcrumb: () => {}, captureIncident: async () => {} },
};

const moduleForTest = { exports: {} };
new Function('module', 'exports', 'require', javascript)(
  moduleForTest,
  moduleForTest.exports,
  name => {
    if (name === '../types') return {};
    if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
    return mocks[name];
  },
);

const { backendApi, ApiHttpError, ApiRequestError, getApiRecoveryMessage } = moduleForTest.exports;

(async () => {
  await Promise.all([
    backendApi.getSections(),
    backendApi.getSectionLevels('section-1'),
  ]);

  assert.equal(jwtCalls, 1, 'concurrent backend calls share one Appwrite JWT request');
  for (const call of fetchCalls) {
    assert.equal(call.options.headers.Authorization, 'Bearer verified-appwrite-jwt');
    assert.equal(
      call.options.headers['Content-Type'],
      undefined,
      'bodyless GET requests must not trigger a JSON CORS preflight',
    );
  }

  nextResponse = {
    ok: false,
    status: 429,
    statusText: 'Too Many Requests',
    headers: { get: name => ({
      'retry-after': '7',
      'x-railway-request-id': 'req-429',
    })[name.toLowerCase()] || null },
    json: async () => ({ detail: 'Please wait.' }),
  };
  await assert.rejects(
    backendApi.getDocuments(),
    error => error instanceof ApiHttpError &&
      error.status === 429 &&
      error.retryAfterSeconds === 7 &&
      error.requestId === 'req-429' &&
      getApiRecoveryMessage(error).includes('7 seconds'),
  );

  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  global.setTimeout = callback => {
    return originalSetTimeout(callback, 0);
  };
  global.clearTimeout = () => {};
  global.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

  await assert.rejects(
    backendApi.healthCheck(),
    error => error instanceof ApiRequestError &&
      error.code === 'timeout' &&
      getApiRecoveryMessage(error).toLowerCase().includes('timed out'),
  );

  assert.match(
    getApiRecoveryMessage(new ApiHttpError({ message: 'blocked', status: 403, endpoint: '/' })),
    /network.*blocked/i,
  );

  global.setTimeout = originalSetTimeout;
  global.clearTimeout = originalClearTimeout;
  console.log('backendApiReliability: passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
