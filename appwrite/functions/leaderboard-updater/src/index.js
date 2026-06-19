import { Client, Databases, Query } from 'node-appwrite';

const REQUIRED_ENV_KEYS = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_USERS_COLLECTION_ID',
  'APPWRITE_LEADERBOARD_COLLECTION_ID',
];

const PAGE_SIZE = 100;
const LAGOS_TIME_ZONE = 'Africa/Lagos';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getLagosMonthParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: LAGOS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  if (!year || !month) {
    throw new Error('Failed to resolve Africa/Lagos month parts');
  }

  return {
    year: Number(year),
    month,
    monthKey: `${year}-${month}`,
  };
}

async function listAllDocuments(databases, databaseId, collectionId, queries = []) {
  const documents = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(databaseId, collectionId, [
      ...queries,
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    documents.push(...response.documents);

    if (response.documents.length < PAGE_SIZE) {
      break;
    }

    offset += response.documents.length;
  }

  return documents;
}

async function updateUsers(databases, databaseId, collectionId, monthKey, log) {
  const users = await listAllDocuments(databases, databaseId, collectionId);
  let updated = 0;

  for (const user of users) {
    await databases.updateDocument(databaseId, collectionId, user.$id, {
      monthlyXP: 0,
      lastMonthlyReset: monthKey,
      updatedAt: new Date().toISOString(),
    });
    updated += 1;
  }

  log(`Reset monthlyXP for ${updated} users`);
  return updated;
}

async function updateLeaderboardSnapshot(databases, databaseId, collectionId, month, year, log) {
  const entries = await listAllDocuments(databases, databaseId, collectionId, [
    Query.equal('month', `${Number(month)}`),
    Query.equal('year', year),
  ]);

  let updated = 0;

  for (const entry of entries) {
    await databases.updateDocument(databaseId, collectionId, entry.$id, {
      monthlyXP: 0,
      rank: Number(entry.rank || 1),
      month: `${Number(month)}`,
      year,
    });
    updated += 1;
  }

  log(`Reset ${updated} leaderboard snapshot rows for ${year}-${month}`);
  return updated;
}

export default async ({ res, log, error }) => {
  try {
    for (const key of REQUIRED_ENV_KEYS) {
      requireEnv(key);
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const usersCollectionId = process.env.APPWRITE_USERS_COLLECTION_ID;
    const leaderboardCollectionId = process.env.APPWRITE_LEADERBOARD_COLLECTION_ID;

    const { month, year, monthKey } = getLagosMonthParts(new Date());

    const usersUpdated = await updateUsers(
      databases,
      databaseId,
      usersCollectionId,
      monthKey,
      log
    );

    const leaderboardUpdated = await updateLeaderboardSnapshot(
      databases,
      databaseId,
      leaderboardCollectionId,
      month,
      year,
      log
    );

    return res.json({
      ok: true,
      timeZone: LAGOS_TIME_ZONE,
      monthKey,
      usersUpdated,
      leaderboardUpdated,
    });
  } catch (err) {
    error(`leaderboard-updater failed: ${err instanceof Error ? err.message : String(err)}`);
    return res.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};
