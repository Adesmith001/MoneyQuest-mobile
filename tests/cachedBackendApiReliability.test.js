const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/services/cachedBackendApi.ts'), 'utf8');
const refreshStart = source.indexOf('async forceRefreshLearningPath');
const refreshSource = source.slice(refreshStart);
assert.ok(
  refreshSource.indexOf('await Promise.all') >= 0 &&
    refreshSource.indexOf('replaceLearningPathCache') > refreshSource.indexOf('await Promise.all'),
  'a complete replacement must be persisted as one staged operation',
);
assert.doesNotMatch(refreshSource, /clearLearningPathCache/, 'refresh must not delete the fallback first');
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

const staleSections = [{ section_id: 'cached-section', title: 'Cached' }];
const staleLevels = [{ level_id: 'cached-level', section_id: 'cached-section', title: 'Cached level' }];
const never = new Promise(() => {});
const state = {
  learning: {
    sections: { data: staleSections, timestamp: 1 },
    levels: { 'cached-section': { data: staleLevels, timestamp: 1 } },
  },
};
const store = { getState: () => state, dispatch: () => {} };
const backendApi = {
  getSections: () => never,
  getSectionLevels: () => never,
};
const cacheService = {
  initialize: async () => ({ cacheVersionBumped: false }),
  saveSections: async () => {},
  saveLevels: async () => {},
  replaceLearningPathCache: async () => {},
};
const mocks = {
  '../store': { store },
  '../config/environment': { ENV: { MONEYQUEST_CACHE_TTL_SECONDS: '1' } },
  '../store/slices/learningSlice': {
    clearLearningCache: () => ({}),
    setSections: () => ({}),
    setSectionsLoading: () => ({}),
    setLevels: () => ({}),
    selectSections: current => current.learning.sections.data,
    selectLevels: sectionId => current => current.learning.levels[sectionId]?.data || [],
  },
  './backendApi': backendApi,
  './cacheService': cacheService,
  './questionFetchPolicy': { shouldRetryQuestionsWithMultilevel: () => false },
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

const cachedBackendApi = moduleForTest.exports.default;
const withDeadline = promise => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('waited for network')), 100)),
]);

(async () => {
  assert.deepEqual(await withDeadline(cachedBackendApi.getSections()), staleSections);
  assert.deepEqual(await withDeadline(cachedBackendApi.getLevels('cached-section')), staleLevels);
  console.log('cachedBackendApiReliability: passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
