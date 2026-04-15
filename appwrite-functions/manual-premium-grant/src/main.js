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
    admins: process.env.APPWRITE_ADMINS_COLLECTION_ID || 'admin_users',
  };
}

function isMissingCollectionError(err) {
  const message = `${err?.message || ''}`.toLowerCase();
  return (
    message.includes('collection with the requested id could not be found') ||
    message.includes('not found')
  );
}

function isManualOwnedSubscription(subscription) {
  return (
    !subscription ||
    subscription.paymentProvider === 'manual_grant' ||
    subscription.paymentProvider === 'none' ||
    subscription.status === 'trial'
  );
}

function stripSubscriptionAuditFields(payload) {
  const sanitized = { ...payload };
  delete sanitized.grantedByUserId;
  delete sanitized.grantedByEmail;
  delete sanitized.grantReason;
  return sanitized;
}

function shouldRetryWithoutSubscriptionAuditFields(err) {
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
    if (!shouldRetryWithoutSubscriptionAuditFields(err)) {
      throw err;
    }

    return databases.createDocument(
      config.databaseId,
      config.subscriptions,
      ID.unique(),
      stripSubscriptionAuditFields(payload),
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
    if (!shouldRetryWithoutSubscriptionAuditFields(err)) {
      throw err;
    }

    return databases.updateDocument(
      config.databaseId,
      config.subscriptions,
      documentId,
      stripSubscriptionAuditFields(payload),
    );
  }
}

function normalizeAdminDocument(doc) {
  const status = `${doc?.status || 'active'}`.toLowerCase();
  const isActive =
    status !== 'inactive' && status !== 'disabled' && status !== 'revoked';

  return {
    $id: doc?.$id,
    email: normalizeEmail(doc?.email),
    userId: doc?.userId || null,
    status,
    isActive,
    addedByEmail: normalizeEmail(doc?.addedByEmail),
    addedByUserId: doc?.addedByUserId || null,
    updatedAt: doc?.updatedAt || doc?.$updatedAt || null,
  };
}

async function findAdminByEmail(databases, config, email) {
  try {
    const result = await databases.listDocuments(config.databaseId, config.admins, [
      Query.equal('email', normalizeEmail(email)),
      Query.limit(1),
    ]);

    if (result.documents.length === 0) {
      return { record: null, raw: null, collectionAvailable: true };
    }

    const raw = result.documents[0];
    return {
      record: normalizeAdminDocument(raw),
      raw,
      collectionAvailable: true,
    };
  } catch (err) {
    if (isMissingCollectionError(err)) {
      return { record: null, raw: null, collectionAvailable: false };
    }

    throw err;
  }
}

async function listManagedAdmins(databases, config) {
  try {
    const result = await databases.listDocuments(config.databaseId, config.admins, [
      Query.orderDesc('$updatedAt'),
      Query.limit(100),
    ]);

    const admins = result.documents
      .map((doc) => normalizeAdminDocument(doc))
      .filter((admin) => admin.email && admin.isActive)
      .map((admin) => ({
        email: admin.email,
        userId: admin.userId,
        status: admin.status,
        source: 'managed',
        addedByEmail: admin.addedByEmail || null,
        updatedAt: admin.updatedAt,
      }));

    return { admins, collectionAvailable: true };
  } catch (err) {
    if (isMissingCollectionError(err)) {
      return { admins: [], collectionAvailable: false };
    }

    throw err;
  }
}

function stripAdminOptionalFields(payload) {
  const sanitized = { ...payload };
  delete sanitized.userId;
  delete sanitized.status;
  delete sanitized.addedByUserId;
  delete sanitized.addedByEmail;
  return sanitized;
}

function shouldRetryWithoutAdminOptionalFields(err) {
  const message = `${err?.message || ''}`.toLowerCase();
  return (
    message.includes('userid') ||
    message.includes('status') ||
    message.includes('addedbyuserid') ||
    message.includes('addedbyemail') ||
    message.includes('unknown attribute') ||
    message.includes('invalid document structure')
  );
}

async function createAdminDocument(databases, config, payload) {
  try {
    return await databases.createDocument(
      config.databaseId,
      config.admins,
      ID.unique(),
      payload,
    );
  } catch (err) {
    if (!shouldRetryWithoutAdminOptionalFields(err)) {
      throw err;
    }

    return databases.createDocument(
      config.databaseId,
      config.admins,
      ID.unique(),
      stripAdminOptionalFields(payload),
    );
  }
}

async function updateAdminDocument(databases, config, documentId, payload) {
  try {
    return await databases.updateDocument(
      config.databaseId,
      config.admins,
      documentId,
      payload,
    );
  } catch (err) {
    if (!shouldRetryWithoutAdminOptionalFields(err)) {
      throw err;
    }

    return databases.updateDocument(
      config.databaseId,
      config.admins,
      documentId,
      stripAdminOptionalFields(payload),
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

function mergeAdminLists(bootstrapAdmins, managedAdmins) {
  const byEmail = new Map();

  for (const admin of managedAdmins) {
    byEmail.set(admin.email, admin);
  }

  for (const admin of bootstrapAdmins) {
    if (!byEmail.has(admin.email)) {
      byEmail.set(admin.email, admin);
    }
  }

  return Array.from(byEmail.values());
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

    const body = req.bodyJson || JSON.parse(req.bodyText || '{}');
    const action = ['preview', 'grant', 'list_admins', 'add_admin'].includes(body.action)
      ? body.action
      : null;

    if (!action) {
      return json(res, { success: false, message: 'Invalid action.' }, 400);
    }

    const client = createServerClient(req);
    const databases = new Databases(client);
    const config = getCollections();
    const allowlist = parseAdminAllowlist(process.env.MONEYQUEST_ADMIN_ALLOWLIST_EMAILS);

    const callerUser = await databases.getDocument(config.databaseId, config.users, callerUserId);
    const callerEmail = normalizeEmail(callerUser.email);
    const callerAdminRecord = await findAdminByEmail(databases, config, callerEmail);
    const callerIsAdmin =
      allowlist.includes(callerEmail) || Boolean(callerAdminRecord.record?.isActive);

    if (!callerIsAdmin) {
      return json(
        res,
        { success: false, message: 'You are not allowed to use this admin endpoint.' },
        403,
      );
    }

    if (action === 'list_admins') {
      const managed = await listManagedAdmins(databases, config);
      const bootstrap = allowlist.map((emailValue) => ({
        email: emailValue,
        userId: null,
        status: 'active',
        source: 'bootstrap',
        addedByEmail: null,
        updatedAt: null,
      }));

      return json(res, {
        success: true,
        admins: mergeAdminLists(bootstrap, managed.admins),
        adminCollectionConfigured: managed.collectionAvailable,
        message: managed.collectionAvailable
          ? 'Admin list loaded.'
          : 'Admin collection not found. Showing bootstrap admins only.',
      });
    }

    if (action === 'add_admin') {
      const normalizedAdminEmail = normalizeEmail(body.adminEmail || body.targetEmail);
      if (!normalizedAdminEmail) {
        return json(res, { success: false, message: 'Admin email is required.' }, 400);
      }

      if (allowlist.includes(normalizedAdminEmail)) {
        return json(res, {
          success: true,
          applied: false,
          admin: {
            email: normalizedAdminEmail,
            userId: null,
            status: 'active',
            source: 'bootstrap',
            addedByEmail: null,
            updatedAt: null,
          },
          message: 'This email is already a bootstrap admin.',
        });
      }

      const existingAdmin = await findAdminByEmail(databases, config, normalizedAdminEmail);
      if (!existingAdmin.collectionAvailable) {
        return json(
          res,
          {
            success: false,
            message:
              'Admin collection is not configured. Create the admin_users table first.',
          },
          400,
        );
      }

      if (existingAdmin.record?.isActive) {
        return json(res, {
          success: true,
          applied: false,
          admin: {
            email: existingAdmin.record.email,
            userId: existingAdmin.record.userId,
            status: existingAdmin.record.status,
            source: 'managed',
            addedByEmail: existingAdmin.record.addedByEmail || null,
            updatedAt: existingAdmin.record.updatedAt,
          },
          message: 'This user is already an active admin.',
        });
      }

      const userSearch = await databases.listDocuments(config.databaseId, config.users, [
        Query.equal('email', normalizedAdminEmail),
        Query.limit(1),
      ]);
      const targetUser = userSearch.documents[0] || null;

      const nowIso = new Date().toISOString();
      const adminPayload = {
        email: normalizedAdminEmail,
        userId: targetUser?.$id || null,
        status: 'active',
        addedByUserId: callerUser.$id,
        addedByEmail: callerEmail,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (existingAdmin.raw?.$id) {
        await updateAdminDocument(databases, config, existingAdmin.raw.$id, {
          ...adminPayload,
          createdAt: existingAdmin.raw.createdAt || existingAdmin.raw.$createdAt || nowIso,
        });
      } else {
        await createAdminDocument(databases, config, adminPayload);
      }

      log(`Admin added by ${callerEmail}: ${normalizedAdminEmail}`);

      return json(res, {
        success: true,
        applied: true,
        admin: {
          email: normalizedAdminEmail,
          userId: targetUser?.$id || null,
          status: 'active',
          source: 'managed',
          addedByEmail: callerEmail,
          updatedAt: nowIso,
        },
        message: 'Admin added successfully.',
      });
    }

    const normalizedTargetEmail = normalizeEmail(body.targetEmail);
    if (!normalizedTargetEmail) {
      return json(res, { success: false, message: 'Target email is required.' }, 400);
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
