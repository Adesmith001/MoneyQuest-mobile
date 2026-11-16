const assert = require('node:assert/strict');
const { test } = require('node:test');

const loadAccess = () => import('../appwrite/functions/school-entitlements/src/studentAccess.js');

function setup({ roster = false, rejectCommit = false, codeStatus = 'depleted' } = {}) {
  const student = {
    $id: 'student', schoolId: 'school', userId: 'user', codeId: roster ? 'invite' : 'code',
    status: 'active', expiresAt: '2028-01-31T12:00:00.000Z',
    ...(roster && { inviteId: 'invite', batchId: 'batch' }),
  };
  const code = { schoolId: 'school', seatsUsed: 2, seatsPurchased: 2, status: codeStatus, expirationDate: '2028-08-01T00:00:00.000Z' };
  const invite = { schoolId: 'school', batchId: 'batch', claimedByUserId: 'user', status: 'claimed', expiresAt: student.expiresAt };
  const batch = { schoolId: 'school', seatsUsed: 1 };
  const documents = new Map([
    ['students/student', student], ['codes/code', code], ['invites/invite', invite], ['batches/batch', batch],
  ]);
  let staged;
  const databases = {
    async createTransaction({ ttl }) {
      assert.equal(ttl, 60);
      staged = new Map();
      return { $id: 'transaction' };
    },
    async getDocument({ collectionId, documentId, transactionId }) {
      assert.equal(transactionId, 'transaction');
      return structuredClone(documents.get(`${collectionId}/${documentId}`));
    },
    async updateDocument({ collectionId, documentId, data, transactionId }) {
      assert.equal(transactionId, 'transaction');
      if (collectionId === 'students') {
        assert.ok(Object.keys(data).every(key => ['status', 'expiresAt', 'updatedAt'].includes(key)));
      }
      const key = `${collectionId}/${documentId}`;
      const updated = { ...documents.get(key), ...data };
      staged.set(key, updated);
      return updated;
    },
    async updateTransaction({ transactionId, commit, rollback }) {
      assert.equal(transactionId, 'transaction');
      if (commit && rejectCommit) throw Object.assign(new Error('Transaction conflict'), { code: 409 });
      if (commit) for (const [key, value] of staged) documents.set(key, value);
      if (rollback) staged.clear();
    },
  };
  const input = {
    databases, databaseId: 'database', schoolId: 'school', studentId: 'student',
    studentsCollectionId: 'students', codesCollectionId: 'codes', invitesCollectionId: 'invites', batchesCollectionId: 'batches',
    timestamp: '2028-01-01T12:00:00.000Z',
  };
  return { documents, input, student, code, invite, batch };
}

test('revoking a shared-code enrollment returns one seat and is safe to repeat', async () => {
  const { updateStudentAccess } = await loadAccess();
  const { documents, input } = setup();
  await updateStudentAccess({ ...input, action: 'revoke_student' });
  await updateStudentAccess({ ...input, action: 'revoke_student' });
  assert.equal(documents.get('students/student').status, 'revoked');
  assert.equal(documents.get('codes/code').seatsUsed, 1);
  assert.equal(documents.get('codes/code').status, 'active');
});

test('reopening a seat preserves the school’s suspension and never reactivates an expired code', async () => {
  const { updateStudentAccess } = await loadAccess();
  const suspended = setup({ codeStatus: 'suspended' });
  await updateStudentAccess({ ...suspended.input, action: 'revoke_student' });
  assert.equal(suspended.documents.get('codes/code').status, 'suspended');

  const expired = setup();
  await updateStudentAccess({ ...expired.input, timestamp: '2028-09-01T12:00:00.000Z', action: 'revoke_student' });
  assert.equal(expired.documents.get('codes/code').status, 'expired');
});

test('extension clamps the month, preserves the seat count, and handles a duplicate request', async () => {
  const { updateStudentAccess } = await loadAccess();
  const { documents, input, student } = setup();
  const request = { ...input, action: 'extend_student', expectedExpiresAt: student.expiresAt };
  await updateStudentAccess(request);
  await updateStudentAccess(request);
  assert.equal(documents.get('students/student').expiresAt, '2028-02-29T12:00:00.000Z');
  assert.equal(documents.get('codes/code').seatsUsed, 2);
  await assert.rejects(updateStudentAccess({ ...request, expectedExpiresAt: '2028-01-15T12:00:00.000Z' }), { code: 409 });
});

test('another school cannot change an enrollment', async () => {
  const { updateStudentAccess } = await loadAccess();
  const { documents, input, student, code } = setup();
  await assert.rejects(updateStudentAccess({ ...input, schoolId: 'other-school', action: 'revoke_student' }), /Student access denied/);
  assert.deepEqual(documents.get('students/student'), student);
  assert.deepEqual(documents.get('codes/code'), code);
});

test('roster actions update the invite and batch, and a failed commit leaves them unchanged', async () => {
  const { updateStudentAccess } = await loadAccess();
  const roster = setup({ roster: true });
  await updateStudentAccess({ ...roster.input, action: 'extend_student', expectedExpiresAt: roster.student.expiresAt });
  assert.equal(roster.documents.get('invites/invite').expiresAt, '2028-02-29T12:00:00.000Z');
  await updateStudentAccess({ ...roster.input, action: 'revoke_student' });
  assert.equal(roster.documents.get('invites/invite').status, 'revoked');
  assert.equal(roster.documents.get('batches/batch').seatsUsed, 0);

  const conflict = setup({ roster: true, rejectCommit: true });
  await assert.rejects(updateStudentAccess({ ...conflict.input, action: 'revoke_student' }), { code: 409 });
  assert.deepEqual(conflict.documents.get('students/student'), conflict.student);
  assert.deepEqual(conflict.documents.get('invites/invite'), conflict.invite);
  assert.deepEqual(conflict.documents.get('batches/batch'), conflict.batch);
});
