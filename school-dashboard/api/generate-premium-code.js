/**
 * Vercel serverless function: POST /api/generate-premium-code
 *
 * Called by the SubscribeSuccessPage after payment.
 * Creates a premium activation code in Appwrite if one doesn't already exist
 * for the given payment reference.
 *
 * Body: { reference: string, userId: string, planType: 'monthly' | 'annual' }
 * Returns: { code: string } or { error: string }
 */

const SUBSCRIPTION_PLANS = {
  monthly: { price: 3500, billingCycle: 'month' },
  annual: { price: 42000, billingCycle: 'year' },
};

export default async function handler(req, res) {
  // CORS headers for the frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference, userId, planType } = req.body || {};

  if (!reference || !userId || !planType) {
    return res.status(400).json({ error: 'Missing reference, userId, or planType' });
  }

  const plan = SUBSCRIPTION_PLANS[planType];
  if (!plan) {
    return res.status(400).json({ error: 'Invalid planType' });
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite');

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const dbId = process.env.APPWRITE_DATABASE_ID;

    // Check if a code already exists for this reference
    const existing = await databases.listDocuments(dbId, 'premium_codes', [
      Query.equal('paymentReference', reference),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      return res.status(200).json({ code: existing.documents[0].code });
    }

    // Generate unique code: MQP-XXXXXX
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'MQP-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Calculate expiration
    const now = new Date();
    const expirationDate = new Date(now);
    if (plan.billingCycle === 'month') {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    } else {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    }

    await databases.createDocument(dbId, 'premium_codes', 'unique()', {
      code,
      userId,
      planType,
      status: 'unused',
      paymentReference: reference,
      amount: plan.price,
      currency: 'NGN',
      expirationDate: expirationDate.toISOString(),
      createdAt: now.toISOString(),
    });

    return res.status(200).json({ code });
  } catch (err) {
    console.error('Error generating premium code:', err);
    return res.status(500).json({ error: 'Failed to generate code' });
  }
}
