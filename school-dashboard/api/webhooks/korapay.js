import crypto from 'crypto';

// Subscription plan prices (must match web frontend)
const SUBSCRIPTION_PLANS = {
  monthly: { price: 2000, billingCycle: 'month' },
  annual: { price: 24000, billingCycle: 'year' },
};

const SCHOOL_SEAT_PRICES = {
  monthly: 3500,
  annual: 42000,
  school_monthly_100: 3200,
  school_annual_100: 38400,
};

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const signature = req.headers['x-korapay-signature'] || '';

    // Validate webhook signature
    const webhookSecret = process.env.KORAPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('KORAPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle payment success
    if (payload.event === 'charge.success' && payload.data?.status === 'success') {
      const { reference, amount, metadata } = payload.data;

      // Determine payment type
      if (metadata?.type === 'school_subscription') {
        return handleSchoolPayment(payload.data, res);
      }

      // Individual subscription
      const userId = metadata?.userId;
      const planType = metadata?.planType;

      if (!userId || !planType) {
        console.error('Missing userId or planType in webhook metadata');
        return res.status(400).json({ error: 'Invalid metadata' });
      }

      const plan = SUBSCRIPTION_PLANS[planType];
      if (!plan) {
        console.error(`Unknown plan type: ${planType}`);
        return res.status(400).json({ error: 'Unknown plan type' });
      }

      if (amount < plan.price) {
        console.error(`Invalid amount. Expected ${plan.price}, got ${amount}`);
        return res.status(400).json({ error: 'Invalid payment amount' });
      }

      // Connect to Appwrite
      const { Client, Databases, Query } = await import('node-appwrite');
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);
      const dbId = process.env.APPWRITE_DATABASE_ID;
      const collectionId = process.env.APPWRITE_SUBSCRIPTIONS_COLLECTION_ID || 'subscriptions';

      const now = new Date();
      const endDate = new Date(now);
      if (plan.billingCycle === 'month') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Generate a premium activation code for the user
      let premiumCode = '';
      try {
        // Check if a code already exists for this payment reference
        const existingCodes = await databases.listDocuments(dbId, 'premium_codes', [
          Query.equal('paymentReference', reference),
          Query.limit(1),
        ]);

        if (existingCodes.documents.length > 0) {
          premiumCode = existingCodes.documents[0].code;
        } else {
          // Generate unique premium code: MQP-XXXXXX
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          premiumCode = 'MQP-';
          for (let i = 0; i < 6; i++) {
            premiumCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          await databases.createDocument(dbId, 'premium_codes', 'unique()', {
            code: premiumCode,
            userId,
            planType,
            status: 'unused',
            paymentReference: reference,
            amount: plan.price,
            currency: 'NGN',
            expirationDate: endDate.toISOString(),
            createdAt: now.toISOString(),
          });

          console.log(`Premium code created: ${premiumCode} for user ${userId}`);
        }
      } catch (codeErr) {
        console.error('Error creating premium code:', codeErr);
        // Continue — the subscription activation below is the fallback
      }

      // Also try to activate subscription directly (webhook backup)
      try {
        const subscriptions = await databases.listDocuments(dbId, collectionId, [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(1),
        ]);

        if (subscriptions.documents.length > 0) {
          await databases.updateDocument(dbId, collectionId, subscriptions.documents[0].$id, {
            planType,
            status: 'active',
            paymentProvider: 'korapay',
            subscriptionStartDate: now.toISOString(),
            subscriptionEndDate: endDate.toISOString(),
            lastPaymentDate: now.toISOString(),
            nextBillingDate: endDate.toISOString(),
            korapayTransactionReference: reference,
            amount: plan.price,
            autoRenew: false,
            updatedAt: now.toISOString(),
          });
        } else {
          await databases.createDocument(dbId, collectionId, 'unique()', {
            userId,
            planType,
            status: 'active',
            paymentProvider: 'korapay',
            trialStartDate: now.toISOString(),
            trialEndDate: now.toISOString(),
            subscriptionStartDate: now.toISOString(),
            subscriptionEndDate: endDate.toISOString(),
            lastPaymentDate: now.toISOString(),
            nextBillingDate: endDate.toISOString(),
            autoRenew: false,
            korapayTransactionReference: reference,
            amount: plan.price,
            currency: 'NGN',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          });
        }
        console.log(`Subscription activated for user ${userId} (${planType})`);
      } catch (subErr) {
        console.error('Error activating subscription directly:', subErr);
        // Not critical — user can use the premium code instead
      }

      return res.status(200).json({
        success: true,
        message: 'Payment processed',
        premiumCode: premiumCode || null,
      });
    }

    // Handle payment failure
    if (payload.event === 'charge.failed') {
      console.log('Payment failed:', payload.data?.reference);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Handle school subscription payments
 */
async function handleSchoolPayment(data, res) {
  const { reference, metadata } = data;
  const { schoolId, seats, planType, codeName, rosterBatchId } = metadata;

  if (!schoolId || !seats || !planType) {
    return res.status(400).json({ error: 'Invalid school payment metadata' });
  }

  const expectedAmount = Number(seats) * Number(SCHOOL_SEAT_PRICES[planType] || 0);
  if (!expectedAmount || Number(data.amount) < expectedAmount) {
    return res.status(400).json({ error: 'Invalid school payment amount' });
  }

  const { Client, Databases, Query } = await import('node-appwrite');
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const dbId = process.env.APPWRITE_DATABASE_ID;

  if (rosterBatchId) {
    const batch = await databases.getDocument(dbId, 'school_seat_batches', rosterBatchId);
    if (batch.schoolId !== schoolId || batch.paymentReference !== reference) {
      return res.status(400).json({ error: 'Roster payment does not match batch' });
    }

    if (batch.status !== 'active') {
      await databases.updateDocument(dbId, 'school_seat_batches', rosterBatchId, {
        status: 'active',
        updatedAt: new Date().toISOString(),
      });

      const pendingInvites = await databases.listDocuments(dbId, 'school_invites', [
        Query.equal('batchId', rosterBatchId),
        Query.equal('status', 'pending_payment'),
        Query.limit(500),
      ]);

      for (let index = 0; index < pendingInvites.documents.length; index += 20) {
        const chunk = pendingInvites.documents.slice(index, index + 20);
        await Promise.all(chunk.map((invite) => databases.updateDocument(dbId, 'school_invites', invite.$id, {
          status: 'unused',
          updatedAt: new Date().toISOString(),
        })));
      }
    }

    const payments = await databases.listDocuments(dbId, 'school_payments', [
      Query.equal('transactionReference', reference),
      Query.limit(1),
    ]);
    if (payments.documents.length > 0 && payments.documents[0].status !== 'success') {
      await databases.updateDocument(dbId, 'school_payments', payments.documents[0].$id, {
        status: 'success',
        paidAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({ success: true, message: 'Roster invites activated' });
  }

  // Check if code already exists for this payment
  const existingCodes = await databases.listDocuments(dbId, 'school_codes', [
    Query.equal('paymentReference', reference),
    Query.limit(1),
  ]);

  if (existingCodes.documents.length === 0) {
    // Generate unique code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'MQ-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Calculate expiration
    const now = new Date();
    const expirationDate = new Date(now);
    if (String(planType).includes('annual')) {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    } else {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    }

    // School bulk pricing: 3200/month, 38400/year per seat
    const pricePerSeat = SCHOOL_SEAT_PRICES[planType] || 0;

    await databases.createDocument(dbId, 'school_codes', 'unique()', {
      schoolId,
      code,
      name: codeName || 'Code',
      seatsPurchased: parseInt(seats),
      seatsUsed: 0,
      planType,
      status: 'active',
      expirationDate: expirationDate.toISOString(),
      activationDate: now.toISOString(),
      paymentReference: reference,
      amount: parseInt(seats) * pricePerSeat,
      pricePerSeat,
      currency: 'NGN',
    });

    console.log(`School code created: ${code} for school: ${schoolId}`);
  }

  // Update payment record
  const payments = await databases.listDocuments(dbId, 'school_payments', [
    Query.equal('transactionReference', reference),
    Query.limit(1),
  ]);

  if (payments.documents.length > 0) {
    await databases.updateDocument(dbId, 'school_payments', payments.documents[0].$id, {
      status: 'success',
      paidAt: new Date().toISOString(),
    });
  }

  return res.status(200).json({ success: true, message: 'School code created' });
}
