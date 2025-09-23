const sdk = require('node-appwrite');

module.exports = async function (req, res) {
  const client = new sdk.Client();
  const database = new sdk.Databases(client);

  if (
    !process.env.APPWRITE_FUNCTION_ENDPOINT ||
    !process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    !process.env.APPWRITE_FUNCTION_API_KEY
  ) {
    res.json({ error: 'Environment variables are not set.' }, 500);
    return;
  }

  client
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  const userId = req.headers['x-appwrite-user-id'];
  if (!userId) {
    res.json({ error: 'User not authenticated.' }, 401);
    return;
  }

  try {
    // --- CONFIGURATION ---
    const DB_ID = '68cc891e001ebcafceeb'; 
    const USERS_COLLECTION_ID = 'users';
    // ---------------------

    const user = await database.getDocument(DB_ID, USERS_COLLECTION_ID, userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
    }

    let newStreak = user.streak || 0;
    const activeDays = new Set(user.activeDays || []);

    if (lastActivity && today.getTime() === lastActivity.getTime()) {
      // Already active today, do nothing.
    } else {
      const diffTime = lastActivity ? today.getTime() - lastActivity.getTime() : Infinity;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      newStreak = (diffDays === 1) ? newStreak + 1 : 1;
    }

    const todayISO = today.toISOString().split('T')[0];
    activeDays.add(todayISO);

    const updatedUser = await database.updateDocument(DB_ID, USERS_COLLECTION_ID, userId, {
      streak: newStreak,
      lastActivityDate: today.toISOString(),
      activeDays: Array.from(activeDays),
    });

    res.json(updatedUser);
  } catch (error) {
    res.json({ error: error.message }, 500);
  }
};