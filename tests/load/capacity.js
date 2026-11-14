import http from 'k6/http';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';
import { sleep } from 'k6';

const mode = __ENV.WORKLOAD;
const runId = __ENV.RUN_ID;
const appwrite = (__ENV.STAGING_APPWRITE_URL || '').replace(/\/$/, '');
const api = (__ENV.STAGING_API_URL || '').replace(/\/$/, '');
const project = __ENV.STAGING_APPWRITE_PROJECT;
const database = __ENV.STAGING_APPWRITE_DATABASE;
const count = Number(__ENV.USERS || 3000);

if (__ENV.STAGING_ISOLATION_VERIFIED !== 'yes' || __ENV.APPWRITE_QUOTAS_VERIFIED !== 'yes' ||
    !appwrite.startsWith('https://') || !api.startsWith('https://') ||
    !project || project === '68cc6ab300330cae9c56' || !database ||
    /moneyquestproject-demo-production|nurtureehaven\.com|moneyquest-sand/.test(api) ||
    !['returning', 'mixed', 'sustained'].includes(mode) ||
    !Number.isInteger(count) || count < 1 || count > 3000 ||
    !__ENV.FIXTURES) {
  throw new Error('Use a verified, isolated Appwrite project and Railway API, with synthetic fixtures.');
}

const fixtures = new SharedArray('synthetic accounts', () => JSON.parse(open(__ENV.FIXTURES)));
const firstIndex = Number(__ENV.FIRST_FIXTURE || 0);
if (!Number.isInteger(firstIndex) || firstIndex < 0 || fixtures.length < firstIndex + count) {
  throw new Error('Provide a distinct fixture per user, including any configured fixture offset.');
}
if (mode === 'sustained' && (!__ENV.LEVEL_ID || !runId)) throw new Error('Set a populated staging lesson ID.');

const loginSuccess = new Rate('login_success');
const signupSuccess = new Rate('signup_success');
const gameplaySuccess = new Rate('gameplay_success');
const loginTime = new Trend('login_ms', true);
const lessonTime = new Trend('lesson_ms', true);
const saveTime = new Trend('save_ms', true);
const throttled = new Counter('unexpected_rate_limits');

const thresholds = mode === 'sustained'
  ? { gameplay_success: ['rate>0.995'], lesson_ms: ['p(95)<3000'], save_ms: ['p(95)<2000'] }
  : { login_success: ['rate>=0.995'], login_ms: ['p(95)<3000'], dropped_iterations: ['count==0'] };
if (mode === 'mixed') thresholds.signup_success = ['rate>=0.995'];

export const options = {
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    selected: mode === 'sustained'
      ? { executor: 'per-vu-iterations', vus: count, iterations: 1, maxDuration: '32m' }
      : { executor: 'constant-arrival-rate', rate: count, timeUnit: '1m', duration: '1m',
          preAllocatedVUs: Math.min(count, 250), maxVUs: Math.min(count, 750), gracefulStop: '25s' },
  },
  thresholds,
};

const projectHeaders = { 'X-Appwrite-Project': project, 'Content-Type': 'application/json' };
const ok = response => response.status >= 200 && response.status < 300;
const request = (method, url, data, name, headers = projectHeaders) => {
  const response = http.request(method, url, data === null ? null : JSON.stringify(data), {
    headers, timeout: '15s', tags: { name }, redirects: 0,
  });
  if (response.status === 429) throttled.add(1, { endpoint: name });
  return response;
};

function signIn(fixture, index) {
  const registration = mode === 'mixed' && index % 5 === 0;
  const started = Date.now();
  if (registration) {
    const signup = request('POST', appwrite + '/account', {
      userId: fixture.id, email: fixture.email, password: fixture.password, name: fixture.name || 'Test Account',
    }, 'account_create');
    if (!ok(signup)) {
      signupSuccess.add(false);
      return null;
    }
  }

  const session = request('POST', appwrite + '/account/sessions/email', {
    email: fixture.email, password: fixture.password,
  }, 'email_session');
  if (!ok(session)) {
    (registration ? signupSuccess : loginSuccess).add(false);
    if (!registration) loginTime.add(Date.now() - started);
    return null;
  }

  const headers = { ...projectHeaders };
  const fallback = session.headers['X-Fallback-Cookies'];
  if (fallback) headers['X-Fallback-Cookies'] = fallback;
  const account = request('GET', appwrite + '/account', null, 'account_read', headers);
  const accountId = ok(account) ? account.json('$id') : '';
  if (accountId !== fixture.id) {
    (registration ? signupSuccess : loginSuccess).add(false);
    if (!registration) loginTime.add(Date.now() - started);
    return null;
  }
  const collection = appwrite + '/databases/' + database + '/collections/' +
    (__ENV.STAGING_USERS_COLLECTION || 'users') + '/documents';
  let profile = request('GET', collection + '/' + accountId, null, 'profile_read', headers);
  if (registration && profile.status === 404) {
    profile = request('POST', collection, {
      documentId: accountId, data: { ...fixture.profile, userId: accountId },
    }, 'profile_create', headers);
  }
  const success = ok(profile) && profile.json('$id') === accountId;
  (registration ? signupSuccess : loginSuccess).add(success);
  if (!registration) loginTime.add(Date.now() - started);
  return success ? { id: accountId, headers } : null;
}

function play(account, index) {
  const syncAt = exec.scenario.startTime + 60000;
  if (Date.now() < syncAt) sleep((syncAt - Date.now()) / 1000);
  const deadline = Date.now() + 30 * 60000;
  let attempt = 0;
  let jwt = '';
  let jwtAt = 0;
  while (Date.now() < deadline) {
    const opening = Date.now();
    if (opening - jwtAt > 9 * 60000) {
      const token = request('POST', appwrite + '/account/jwts', {}, 'create_jwt', account.headers);
      jwt = ok(token) ? token.json('jwt') : '';
      if (jwt) jwtAt = Date.now();
    }
    const headers = { 'Content-Type': 'application/json', ...(jwt ? { Authorization: 'Bearer ' + jwt } : {}) };
    const level = api + '/levels/' + __ENV.LEVEL_ID;
    const lesson = request('GET', level, null, 'level_detail', headers);
    const questions = request('GET', level + '/questions?limit=5', null, 'level_questions', headers);
    lessonTime.add(Date.now() - opening);
    if (attempt === 0 && Date.now() < syncAt + 30000) sleep((syncAt + 30000 - Date.now()) / 1000);
    else sleep(10 + (index % 20));
    const key = 'mq2-' + runId + '-' + account.id + '-' + attempt++;
    const started = Date.now();
    const payload = {
      user_id: account.id, level_id: __ENV.LEVEL_ID, score: 100,
      time_spent_minutes: 1, idempotency_key: key,
    };
    const saved = request('POST', api + '/submit-level', payload, 'submit_level', headers);
    saveTime.add(Date.now() - started);
    let persisted = ok(saved);
    if (attempt === 1 && persisted) {
      const replay = request('POST', api + '/submit-level', payload, 'replay_submit', headers);
      persisted = ok(replay) && JSON.stringify(saved.json()) === JSON.stringify(replay.json());
    }
    gameplaySuccess.add(Boolean(jwt) && ok(lesson) && ok(questions) && persisted);
    sleep(20 + (index % 20));
  }
}

export default function () {
  const index = mode === 'sustained' ? exec.vu.idInTest - 1 : exec.scenario.iterationInTest;
  const account = signIn(fixtures[firstIndex + index], firstIndex + index);
  if (!account) {
    if (mode === 'sustained') gameplaySuccess.add(false);
    return;
  }
  const home = request('GET', api + '/content/learning-path', null, 'learning_path', {});
  if (mode === 'sustained') {
    gameplaySuccess.add(ok(home));
    play(account, index);
  }
}
