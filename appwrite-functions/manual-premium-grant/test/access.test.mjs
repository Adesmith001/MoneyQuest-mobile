import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeEmail,
  parseAdminAllowlist,
  computeEffectiveAccess,
  resolveGrantOutcome,
} from '../src/access.js';

test('normalizeEmail trims and lowercases emails', () => {
  assert.equal(normalizeEmail(' CEO@MoneyQuest.com '), 'ceo@moneyquest.com');
});

test('parseAdminAllowlist removes blanks and normalizes casing', () => {
  assert.deepEqual(parseAdminAllowlist('boss@example.com, ,CEO@MoneyQuest.com'), [
    'boss@example.com',
    'ceo@moneyquest.com',
  ]);
});

test('computeEffectiveAccess prefers the later of subscription and school expiry', () => {
  const result = computeEffectiveAccess({
    subscription: {
      status: 'active',
      subscriptionEndDate: '2026-05-01T23:59:59.999Z',
    },
    schoolEnrollment: {
      status: 'active',
      expiresAt: '2026-06-15T23:59:59.999Z',
    },
    now: '2026-04-14T10:00:00.000Z',
  });

  assert.equal(result.source, 'school');
  assert.equal(result.effectiveEndDate, '2026-06-15T23:59:59.999Z');
});

test('resolveGrantOutcome marks later grants as extend', () => {
  const result = resolveGrantOutcome({
    requestedExpiresAt: '2026-07-01',
    currentEffectiveEndDate: '2026-06-15T23:59:59.999Z',
  });

  assert.equal(result.action, 'extend');
  assert.equal(result.finalEffectiveEndDate, '2026-07-01T23:59:59.999Z');
});

test('resolveGrantOutcome keeps access unchanged when requested expiry is earlier', () => {
  const result = resolveGrantOutcome({
    requestedExpiresAt: '2026-05-20',
    currentEffectiveEndDate: '2026-06-15T23:59:59.999Z',
  });

  assert.equal(result.action, 'unchanged');
  assert.equal(result.finalEffectiveEndDate, '2026-06-15T23:59:59.999Z');
});

test('resolveGrantOutcome creates a new grant when no access exists', () => {
  const result = resolveGrantOutcome({
    requestedExpiresAt: '2026-05-20',
    currentEffectiveEndDate: null,
  });

  assert.equal(result.action, 'create');
  assert.equal(result.finalEffectiveEndDate, '2026-05-20T23:59:59.999Z');
});
