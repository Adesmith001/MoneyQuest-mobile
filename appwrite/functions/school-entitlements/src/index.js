import crypto from 'crypto';
import { Client, Databases, ID, Query, Users } from 'node-appwrite';

const requiredEnv = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_USERS_COLLECTION_ID',
  'APPWRITE_SCHOOLS_COLLECTION_ID',
  'APPWRITE_SCHOOL_BATCHES_COLLECTION_ID',
  'APPWRITE_SCHOOL_INVITES_COLLECTION_ID',
  'APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID',
];

const now = () => new Date().toISOString();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRows(rows) {
  const result = [];
  const seen = new Set();

  for (const row of Array.isArray(rows) ? rows : []) {
    const email = normalizeEmail(row.email);
    if (!email || !email.includes('@') || seen.has(email)) continue;
    seen.add(email);
    result.push({
      email,
      studentName: String(row.studentName || row.name || '').trim().slice(0, 160),
      className: String(row.className || row.class || '').trim().slice(0, 120),
    });
  }

  return result;
}

function createInviteCode() {
  return `MQS-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function getUserId(req) {
  return req.headers?.['x-appwrite-user-id'] || req.headers?.['X-Appwrite-User-Id'] || null;
}

async function getSchoolContext(databases, users, databaseId, schoolsCollectionId, userId, schoolId) {
  if (!userId) throw new Error('Authentication required');
  const user = await users.get(userId);
  const school = await databases.getDocument(databaseId, schoolsCollectionId, schoolId);
  const ownerMatches = school.ownerUserId === userId || normalizeEmail(school.email) === normalizeEmail(user.email);
  if (!ownerMatches) throw new Error('School access denied');
  return { user, school };
}

async function claimInvite({ databases, databaseId, invite, user, batchesCollectionId, studentsCollectionId, invitesCollectionId, schoolsCollectionId }) {
  if (invite.status !== 'unused') return { claimed: false, reason: invite.status };
  if (new Date(invite.expiresAt) <= new Date()) return { claimed: false, reason: 'expired' };

  const existing = await databases.listDocuments(databaseId, studentsCollectionId, [
    Query.equal('userId', user.$id),
    Query.equal('status', 'active'),
    Query.limit(1),
  ]);
  if (existing.documents.length > 0) return { claimed: true, enrollment: existing.documents[0] };

  const enrollmentId = `invite_${invite.$id}`;
  const enrollment = {
    userId: user.$id,
    schoolId: invite.schoolId,
    batchId: invite.batchId,
    codeId: invite.$id,
    inviteId: invite.$id,
    studentPublicId: `MQS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    enrolledAt: now(),
    expiresAt: invite.expiresAt,
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  };

  try {
    const created = await databases.createDocument(
      databaseId,
      studentsCollectionId,
      enrollmentId,
      enrollment,
      [`read("user:${user.$id}")`, `update("user:${user.$id}")`]
    );

    await databases.updateDocument(databaseId, invitesCollectionId, invite.$id, {
      status: 'claimed',
      claimedByUserId: user.$id,
      claimedAt: now(),
      updatedAt: now(),
    });

    const batch = await databases.getDocument(databaseId, batchesCollectionId, invite.batchId);
    await databases.updateDocument(databaseId, batchesCollectionId, invite.batchId, {
      seatsUsed: Math.min(Number(batch.seatsPurchased), Number(batch.seatsUsed || 0) + 1),
      updatedAt: now(),
    });

    return { claimed: true, enrollment: created };
  } catch (error) {
    const existingEnrollment = await databases.getDocument(databaseId, studentsCollectionId, enrollmentId).catch(() => null);
    if (existingEnrollment) return { claimed: true, enrollment: existingEnrollment };
    throw error;
  }
}

export default async ({ req, res, error }) => {
  try {
    requiredEnv.forEach(requireEnv);

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const users = new Users(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const usersCollectionId = process.env.APPWRITE_USERS_COLLECTION_ID;
    const schoolsCollectionId = process.env.APPWRITE_SCHOOLS_COLLECTION_ID;
    const batchesCollectionId = process.env.APPWRITE_SCHOOL_BATCHES_COLLECTION_ID;
    const invitesCollectionId = process.env.APPWRITE_SCHOOL_INVITES_COLLECTION_ID;
    const studentsCollectionId = process.env.APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID;
    const body = req.bodyJson || JSON.parse(req.body || '{}');
    const action = body.action;
    const userId = getUserId(req);

    if (action === 'prepare_roster') {
      const { schoolId, name, planType, expiresAt, paymentReference, rows } = body;
      const { school } = await getSchoolContext(databases, users, databaseId, schoolsCollectionId, userId, schoolId);
      const normalizedRows = normalizeRows(rows);
      if (normalizedRows.length === 0) throw new Error('At least one valid email is required');
      const batch = await databases.createDocument(databaseId, batchesCollectionId, ID.unique(), {
        schoolId,
        name: String(name || 'Student roster').trim().slice(0, 160),
        planType: String(planType || 'annual'),
        seatsPurchased: normalizedRows.length,
        seatsUsed: 0,
        status: 'pending_payment',
        paymentReference: String(paymentReference || ''),
        expirationDate: expiresAt,
        createdAt: now(),
        updatedAt: now(),
      });

      const invites = [];
      for (let index = 0; index < normalizedRows.length; index += 20) {
        const chunk = normalizedRows.slice(index, index + 20);
        const created = await Promise.all(chunk.map(async (row) => {
          const code = createInviteCode();
          const invite = await databases.createDocument(databaseId, invitesCollectionId, ID.unique(), {
            schoolId,
            batchId: batch.$id,
            email: row.email,
            normalizedEmail: row.email,
            studentName: row.studentName,
            className: row.className,
            inviteCode: code,
            codeHash: hashCode(code),
            codeLast4: code.slice(-4),
            status: 'pending_payment',
            expiresAt,
            createdAt: now(),
            updatedAt: now(),
          });
          return { ...invite, inviteCode: code };
        }));
        invites.push(...created);
      }

      return res.json({ ok: true, schoolId: school.$id, batchId: batch.$id, seats: invites.length });
    }

    if (action === 'list_invites') {
      const { schoolId, batchId } = body;
      await getSchoolContext(databases, users, databaseId, schoolsCollectionId, userId, schoolId);
      const response = await databases.listDocuments(databaseId, invitesCollectionId, [
        Query.equal('schoolId', schoolId),
        Query.equal('batchId', batchId),
        Query.limit(500),
      ]);
      return res.json({ ok: true, invites: response.documents });
    }

    if (action === 'list_students') {
      const { schoolId } = body;
      await getSchoolContext(databases, users, databaseId, schoolsCollectionId, userId, schoolId);
      const response = await databases.listDocuments(databaseId, studentsCollectionId, [
        Query.equal('schoolId', schoolId),
        Query.orderDesc('enrolledAt'),
        Query.limit(500),
      ]);
      const students = await Promise.all(response.documents.map(async (student) => {
        const user = await users.get(student.userId).catch(() => null);
        const profile = await databases.getDocument(databaseId, usersCollectionId, student.userId).catch(() => null);
        return {
          ...student,
          user: user ? {
            $id: user.$id,
            name: user.name,
            email: user.email,
            emailVerification: user.emailVerification,
            xp: profile?.xp || 0,
            currentLevelId: profile?.currentLevelId || null,
            currentSectionId: profile?.currentSectionId || null,
            streak: profile?.streak || 0,
            lastActiveAt: profile?.updatedAt || null,
          } : undefined,
        };
      }));
      return res.json({ ok: true, students });
    }

    if (action === 'revoke_student' || action === 'extend_student') {
      const { schoolId, studentId, expiresAt } = body;
      await getSchoolContext(databases, users, databaseId, schoolsCollectionId, userId, schoolId);
      const student = await databases.getDocument(databaseId, studentsCollectionId, studentId);
      if (student.schoolId !== schoolId) throw new Error('Student access denied');
      const update = action === 'revoke_student'
        ? { status: 'revoked', revokedAt: now(), revokedBy: userId, updatedAt: now() }
        : { status: 'active', expiresAt, updatedAt: now(), revokedAt: null, revokedBy: null };
      const updated = await databases.updateDocument(databaseId, studentsCollectionId, studentId, update);
      if (student.inviteId) {
        await databases.updateDocument(databaseId, invitesCollectionId, student.inviteId, {
          status: action === 'revoke_student' ? 'revoked' : 'claimed',
          ...(action === 'extend_student' ? { expiresAt } : {}),
          updatedAt: now(),
        });
      }
      return res.json({ ok: true, student: updated });
    }

    if (action === 'claim_email' || action === 'claim_code') {
      if (!userId) throw new Error('Authentication required');
      const user = await users.get(userId);
      if (!user.emailVerification) return res.json({ ok: true, claimed: false, reason: 'email_unverified' });
      const lookup = action === 'claim_email'
        ? [Query.equal('normalizedEmail', normalizeEmail(user.email))]
        : [Query.equal('codeHash', hashCode(String(body.code || '').trim().toUpperCase()))];
      const response = await databases.listDocuments(databaseId, invitesCollectionId, [
        ...lookup,
        Query.equal('status', 'unused'),
        Query.limit(1),
      ]);
      if (response.documents.length === 0) return res.json({ ok: true, claimed: false, reason: 'not_found' });
      const invite = response.documents[0];
      if (action === 'claim_code' && normalizeEmail(invite.normalizedEmail) !== normalizeEmail(user.email)) {
        return res.json({ ok: true, claimed: false, reason: 'email_mismatch' });
      }
      const result = await claimInvite({ databases, databaseId, invite, user, batchesCollectionId, studentsCollectionId, invitesCollectionId, schoolsCollectionId });
      return res.json({ ok: true, ...result });
    }

    if (action === 'preview_code') {
      if (!userId) throw new Error('Authentication required');
      const code = String(body.code || '').trim().toUpperCase();
      const response = await databases.listDocuments(databaseId, invitesCollectionId, [
        Query.equal('codeHash', hashCode(code)),
        Query.limit(1),
      ]);
      if (response.documents.length === 0) return res.json({ ok: false, message: 'Invalid code' }, 404);
      const invite = response.documents[0];
      const batch = await databases.getDocument(databaseId, batchesCollectionId, invite.batchId);
      const school = await databases.getDocument(databaseId, schoolsCollectionId, invite.schoolId);
      return res.json({
        ok: true,
        code: {
          $id: invite.$id,
          schoolId: invite.schoolId,
          name: batch.name,
          code,
          seatsPurchased: batch.seatsPurchased,
          seatsUsed: batch.seatsUsed,
          status: invite.status === 'unused' && new Date(invite.expiresAt) > new Date() ? 'active' : invite.status,
          expirationDate: invite.expiresAt,
        },
        school,
      });
    }

    throw new Error('Unsupported action');
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return res.json({ ok: false, message: err instanceof Error ? err.message : 'Request failed' }, 400);
  }
};
