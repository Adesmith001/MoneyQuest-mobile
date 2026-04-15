import { Client, Databases, ID, Query } from 'node-appwrite';

import {
  computeEffectiveAccess,
  normalizeEmail,
  parseAdminAllowlist,
  resolveGrantOutcome,
} from './access.js';

function json(res, body, status = 200) {
  return res.json(body, status);
}

function createServerClient(req) {
  const endpoint =
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    'https://fra.cloud.appwrite.io/v1';
  const projectId =
    process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey =
    req.headers['x-appwrite-key'] || process.env.APPWRITE_FUNCTION_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error('Function Appwrite credentials are not configured.');
  }

  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

function getCollections() {
  return {
    databaseId: process.env.APPWRITE_DATABASE_ID,
    users: process.env.APPWRITE_USERS_COLLECTION_ID || 'users',
    subscriptions: process.env.APPWRITE_SUBSCRIPTIONS_COLLECTION_ID || 'subscriptions',
    schoolStudents: process.env.APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID || 'school_students',
  };
}

function isManualOwnedSubscription(subscription) {
  return (
    !subscription ||
    subscription.paymentProvider === 'manual_grant' ||
    subscription.paymentProvider === 'none' ||
    subscription.status === 'trial'
  );
}

function stripAuditFields(payload) {
  const sanitized = { ...payload };
  delete sanitized.grantedByUserId;
  delete sanitized.grantedByEmail;
  delete sanitized.grantReason;
  return sanitized;
}

function shouldRetryWithoutAuditFields(err) {
  const message = `${err?.message || ''}`.toLowerCase();
  return (
    message.includes('grantedbyuserid') ||
    message.includes('grantedbyemail') ||
    message.includes('grantreason') ||
    message.includes('unknown attribute') ||
    message.includes('invalid document structure')
  );
}

async function createSubscriptionDocument(databases, config, payload) {
  try {
    return await databases.createDocument(
      config.databaseId,
      config.subscriptions,
      ID.unique(),
      payload,
    );
  } catch (err) {
    if (!shouldRetryWithoutAuditFields(err)) {
      throw err;
    }

    return databases.createDocument(
      config.databaseId,
      config.subscriptions,
      ID.unique(),
      stripAuditFields(payload),
    );
  }
}

async function updateSubscriptionDocument(databases, config, documentId, payload) {
  try {
    return await databases.updateDocument(
      config.databaseId,
      config.subscriptions,
      documentId,
      payload,
    );
  } catch (err) {
    if (!shouldRetryWithoutAuditFields(err)) {
      throw err;
    }

    return databases.updateDocument(
      config.databaseId,
      config.subscriptions,
      documentId,
      stripAuditFields(payload),
    );
  }
}

async function getLatestSubscription(databases, config, userId) {
  const result = await databases.listDocuments(config.databaseId, config.subscriptions, [
    Query.equal('userId', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(1),
  ]);

  return result.documents[0] || null;
}

async function getLatestSchoolEnrollment(databases, config, userId) {
  const result = await databases.listDocuments(config.databaseId, config.schoolStudents, [
    Query.equal('userId', userId),
    Query.equal('status', 'active'),
    Query.orderDesc('expiresAt'),
    Query.limit(1),
  ]);

  return result.documents[0] || null;
}

function buildGrantResponse({
  action,
  applied,
  currentAccess,
  targetUser,
  finalEffectiveEndDate,
  subscriptionId = null,
  message,
}) {
  return {
    success: true,
    action,
    applied,
    currentAccessSource: currentAccess.source,
    previousEffectiveEndDate: currentAccess.effectiveEndDate,
    finalEffectiveEndDate,
    targetUser: {
      $id: targetUser.$id,
      email: targetUser.email,
      name: targetUser.name || 'Unknown User',
    },
    subscriptionId,
    message,
  };
}

export default async function (context) {
  const { req, res, log, error } = context;

  if (req.method !== 'POST') {
    return json(res, { success: false, message: 'Method not allowed.' }, 405);
  }

  try {
    const callerUserId = req.headers['x-appwrite-user-id'];
    if (!callerUserId) {
      return json(res, { success: false, message: 'Authentication required.' }, 401);
    }

    const allowlist = parseAdminAllowlist(process.env.MONEYQUEST_ADMIN_ALLOWLIST_EMAILS);
    if (allowlist.length === 0) {
      return json(res, { success: false, message: 'Admin allowlist is empty.' }, 403);
    }

    const body = req.bodyJson || JSON.parse(req.bodyText || '{}');
    const action = body.action === 'grant' ? 'grant' : body.action === 'preview' ? 'preview' : null;
    if (!action) {
      return json(res, { success: false, message: 'Invalid action.' }, 400);
    }

    const normalizedTargetEmail = normalizeEmail(body.targetEmail);
    if (!normalizedTargetEmail) {
      return json(res, { success: false, message: 'Target email is required.' }, 400);
    }

    const client = createServerClient(req);
    const databases = new Databases(client);
    const config = getCollections();

    const callerUser = await databases.getDocument(config.databaseId, config.users, callerUserId);
    const callerEmail = normalizeEmail(callerUser.email);
    if (!allowlist.includes(callerEmail)) {
      return json(res, { success: false, message: 'You are not allowed to grant premium access.' }, 403);
    }

    const userSearch = await databases.listDocuments(config.databaseId, config.users, [
      Query.equal('email', normalizedTargetEmail),
      Query.limit(1),
    ]);

    if (userSearch.documents.length === 0) {
      return json(res, { success: false, message: 'No user found for that email address.' }, 404);
    }

    const targetUser = userSearch.documents[0];
    const subscription = await getLatestSubscription(databases, config, targetUser.$id);
    const schoolEnrollment = await getLatestSchoolEnrollment(databases, config, targetUser.$id);
    const currentAccess = computeEffectiveAccess({
      subscription,
      schoolEnrollment,
      now: new Date().toISOString(),
    });
    const outcome = resolveGrantOutcome({
      requestedExpiresAt: body.expiresAt,
      currentEffectiveEndDate: currentAccess.effectiveEndDate,
    });

    if (action === 'preview') {
      return json(
        res,
        buildGrantResponse({
          action: outcome.action,
          applied: false,
          currentAccess,
          targetUser,
          finalEffectiveEndDate: outcome.finalEffectiveEndDate,
          subscriptionId: subscription?.$id || null,
          message:
            outcome.action === 'unchanged'
              ? 'User already has premium access that lasts longer than the requested date.'
              : 'Preview ready.',
        }),
      );
    }

    if (outcome.action === 'unchanged') {
      return json(
        res,
        buildGrantResponse({
          action: outcome.action,
          applied: false,
          currentAccess,
          targetUser,
          finalEffectiveEndDate: outcome.finalEffectiveEndDate,
          subscriptionId: subscription?.$id || null,
          message:
            'No changes made because the user already has premium access through a later date.',
        }),
      );
    }

    const nowIso = new Date().toISOString();
    const grantReason = `${body.reason || ''}`.trim();
    const auditFields = {
      grantedByUserId: callerUser.$id,
      grantedByEmail: callerEmail,
      grantReason: grantReason || undefined,
    };
    let updatedSubscriptionId = subscription?.$id || null;

    if (!subscription) {
      const created = await createSubscriptionDocument(databases, config, {
        userId: targetUser.$id,
        planType: 'monthly',
        status: 'active',
        paymentProvider: 'manual_grant',
        trialStartDate: nowIso,
        trialEndDate: nowIso,
        subscriptionStartDate: nowIso,
        subscriptionEndDate: outcome.finalEffectiveEndDate,
        autoRenew: false,
        amount: 0,
        currency: 'NGN',
        createdAt: nowIso,
        updatedAt: nowIso,
        ...auditFields,
      });
      updatedSubscriptionId = created.$id;
    } else {
      const updatePayload = {
        status: 'active',
        subscriptionEndDate: outcome.finalEffectiveEndDate,
        updatedAt: nowIso,
        ...auditFields,
        ...(isManualOwnedSubscription(subscription)
          ? {
              paymentProvider: 'manual_grant',
              autoRenew: false,
              amount: 0,
              currency: subscription.currency || 'NGN',
            }
          : {}),
      };

      await updateSubscriptionDocument(
        databases,
        config,
        subscription.$id,
        updatePayload,
      );
    }

    log(
      `Manual premium grant ${outcome.action} by ${callerEmail} for ${normalizedTargetEmail} until ${outcome.finalEffectiveEndDate}`,
    );

    return json(
      res,
      buildGrantResponse({
        action: outcome.action,
        applied: true,
        currentAccess,
        targetUser,
        finalEffectiveEndDate: outcome.finalEffectiveEndDate,
        subscriptionId: updatedSubscriptionId,
        message:
          outcome.action === 'create'
            ? 'Premium access granted successfully.'
            : 'Premium access extended successfully.',
      }),
    );
  } catch (err) {
    error(err?.stack || err?.message || String(err));
    return json(
      res,
      {
        success: false,
        message: err?.message || 'Manual premium grant failed.',
      },
      500,
    );
  }
}
