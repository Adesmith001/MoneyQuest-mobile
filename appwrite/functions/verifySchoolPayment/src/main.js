import { Client, Databases, Query } from 'node-appwrite';

// School pricing (must match frontend)
const SCHOOL_PRICING = {
  monthly: { pricePerSeat: 3000, billingCycle: 'month' },
  annual: { pricePerSeat: 35000, billingCycle: 'year' }
};

/**
 * Verify payment with KoraPay API
 */
async function verifyWithKoraPay(reference, secretKey) {
  const response = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  return data;
}

/**
 * Main handler - verifies school payment and creates code
 */
export default async ({ req, res, log, error: logError }) => {
  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const dbId = process.env.APPWRITE_DATABASE_ID;

    // Parse request
    const { reference, schoolId, codeName, seats, planType } = JSON.parse(req.body || '{}');

    if (!reference || !schoolId || !seats || !planType) {
      return res.json({
        success: false,
        message: 'Missing required parameters',
      }, 400);
    }

    log(`Verifying payment: ${reference} for school: ${schoolId}`);

    // Get payment record to retrieve codeName
    let paymentRecord = null;
    let finalCodeName = codeName || 'Code';
    
    try {
      const payments = await databases.listDocuments(
        dbId,
        'school_payments',
        [Query.equal('transactionReference', reference), Query.limit(1)]
      );
      
      if (payments.documents.length > 0) {
        paymentRecord = payments.documents[0];
        finalCodeName = paymentRecord.codeName || codeName || 'Code';
        log(`Found payment record with codeName: ${finalCodeName}`);
      }
    } catch (err) {
      log('Could not fetch payment record, using provided codeName');
    }

    // Verify payment with KoraPay
    const verification = await verifyWithKoraPay(reference, process.env.KORAPAY_SECRET_KEY);

    if (!verification.status || !verification.data) {
      logError('Payment verification failed:', verification);
      return res.json({
        success: false,
        message: 'Payment verification failed',
      }, 400);
    }

    const paymentStatus = verification.data.status;
    const paidAmount = verification.data.amount;

    if (paymentStatus !== 'success' && paymentStatus !== 'completed') {
      return res.json({
        success: false,
        message: `Payment not successful. Status: ${paymentStatus}`,
      }, 400);
    }

    // Verify amount matches expected
    const plan = SCHOOL_PRICING[planType];
    if (!plan) {
      return res.json({
        success: false,
        message: 'Invalid plan type',
      }, 400);
    }

    const expectedAmount = plan.pricePerSeat * seats;
    if (paidAmount < expectedAmount) {
      logError(`Amount mismatch: expected ${expectedAmount}, got ${paidAmount}`);
      return res.json({
        success: false,
        message: 'Payment amount does not match expected amount',
      }, 400);
    }

    // Generate unique code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'MQ-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if a code already exists for this payment reference (prevent duplicates)
    const existingCodes = await databases.listDocuments(
      dbId,
      'school_codes',
      [Query.equal('paymentReference', reference), Query.limit(1)]
    );

    if (existingCodes.documents.length > 0) {
      log(`Code already exists for payment reference: ${reference}`);
      const existingCode = existingCodes.documents[0];
      
      return res.json({
        success: true,
        message: 'Code already created for this payment',
        data: {
          codeId: existingCode.$id,
          code: existingCode.code,
          name: existingCode.name,
          seats: existingCode.seatsPurchased,
          expirationDate: existingCode.expirationDate,
        },
      });
    }

    // Calculate expiration date
    const now = new Date();
    const expirationDate = new Date(now);
    if (planType === 'annual') {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    } else {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    }

    // Create the school code
    const schoolCode = await databases.createDocument(
      dbId,
      'school_codes',
      'unique()',
      {
        schoolId,
        code,
        name: finalCodeName,
        seatsPurchased: seats,
        seatsUsed: 0,
        planType,
        status: 'active',
        expirationDate: expirationDate.toISOString(),
        activationDate: now.toISOString(),
        paymentReference: reference,
        amount: expectedAmount,
        pricePerSeat: plan.pricePerSeat,
        currency: 'NGN',
      }
    );

    // Update payment record
    const payments = await databases.listDocuments(
      dbId,
      'school_payments',
      [Query.equal('transactionReference', reference), Query.limit(1)]
    );

    if (payments.documents.length > 0) {
      await databases.updateDocument(
        dbId,
        'school_payments',
        payments.documents[0].$id,
        {
          status: 'success',
          paymentMethod: verification.data.payment_method || 'card',
          paidAt: now.toISOString(),
        }
      );
    }

    log(`Successfully created code: ${code} for school: ${schoolId}`);

    return res.json({
      success: true,
      message: 'Payment verified and code created',
      data: {
        codeId: schoolCode.$id,
        code: schoolCode.code,
        name: schoolCode.name,
        seats: schoolCode.seatsPurchased,
        expirationDate: schoolCode.expirationDate,
      },
    });

  } catch (err) {
    logError('Error:', err.message);
    return res.json({
      success: false,
      message: err.message || 'Internal server error',
    }, 500);
  }
};
