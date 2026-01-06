import { Client, Databases, Query } from 'node-appwrite';
import crypto from 'crypto';

// Subscription plan prices (must match frontend)
const SUBSCRIPTION_PLANS = {
  monthly: { price: 3000, billingCycle: 'month', duration: 'month' },
  annual: { price: 35000, billingCycle: 'year', duration: 'year' }
};

/**
 * Validate KoraPay webhook signature
 */
function validateWebhookSignature(payload, signature, secret) {
  try {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return hash === signature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Activate subscription in Appwrite
 */
async function activateSubscription(databases, dbId, collectionId, userId, planType, reference, amount) {
  try {
    // Get user's subscription
    const subscriptions = await databases.listDocuments(
      dbId,
      collectionId,
      [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(1)]
    );

    if (subscriptions.documents.length === 0) {
      throw new Error('Subscription not found');
    }

    const subscription = subscriptions.documents[0];
    const plan = SUBSCRIPTION_PLANS[planType];

    // Verify amount matches plan price
    if (amount < plan.price) {
      throw new Error(`Invalid payment amount. Expected ${plan.price}, got ${amount}`);
    }

    const now = new Date();
    const endDate = new Date(now);

    // Calculate subscription end date
    if (plan.billingCycle === 'month') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Update subscription
    await databases.updateDocument(
      dbId,
      collectionId,
      subscription.$id,
      {
        planType,
        status: 'active',
        subscriptionStartDate: now.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        lastPaymentDate: now.toISOString(),
        nextBillingDate: endDate.toISOString(),
        korapayTransactionReference: reference,
        amount: plan.price,
        updatedAt: now.toISOString()
      }
    );

    return { success: true, message: 'Subscription activated' };
  } catch (error) {
    console.error('Subscription activation error:', error);
    throw error;
  }
}

/**
 * Main webhook handler
 */
export default async ({ req, res, log, error: logError }) => {
  try {
    // Parse webhook payload
    const payload = JSON.parse(req.body || '{}');
    const signature = req.headers['x-korapay-signature'] || '';

    log('Received webhook:', payload.event);

    // Validate webhook signature
    const webhookSecret = process.env.KORAPAY_WEBHOOK_SECRET;
    if (!validateWebhookSignature(payload, signature, webhookSecret)) {
      logError('Invalid webhook signature');
      return res.json({ error: 'Invalid signature' }, 401);
    }

    // Handle payment success
    if (payload.event === 'charge.success') {
      const { reference, amount, currency, status, metadata } = payload.data;

      if (status === 'success') {
        // Initialize Appwrite client
        const client = new Client()
          .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
          .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
          .setKey(process.env.APPWRITE_API_KEY);

        const databases = new Databases(client);
        const dbId = process.env.APPWRITE_DATABASE_ID;
        const collectionId = process.env.APPWRITE_SUBSCRIPTIONS_COLLECTION_ID;

        // Extract metadata from KoraPay
        const userId = metadata?.userId;
        const planType = metadata?.planType;

        if (!userId || !planType) {
          logError('Missing userId or planType in webhook metadata');
          return res.json({ error: 'Invalid metadata' }, 400);
        }

        // Activate subscription
        await activateSubscription(
          databases,
          dbId,
          collectionId,
          userId,
          planType,
          reference,
          amount
        );

        log(`Subscription activated for user ${userId}`);
        return res.json({ success: true, message: 'Subscription activated' });
      }
    }

    // Handle payment failure
    if (payload.event === 'charge.failed') {
      log('Payment failed:', payload.data.reference);
      // Optionally notify user or log the failure
    }

    return res.json({ received: true });
  } catch (err) {
    logError('Webhook processing error:', err);
    return res.json({ error: err.message }, 500);
  }
};
