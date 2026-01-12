const sdk = require('node-appwrite');
const crypto = require('crypto');

module.exports = async function (req, res) {
  const client = new sdk.Client();
  const database = new sdk.Databases(client);
  const users = new sdk.Users(client);

  if (
    !process.env.APPWRITE_FUNCTION_ENDPOINT ||
    !process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    !process.env.APPWRITE_FUNCTION_API_KEY
  ) {
    return res.json({ success: false, error: 'Environment variables are not set.' }, 500);
  }

  client
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  try {
    // Parse the request body
    const body = JSON.parse(req.body || '{}');
    const { email, otp } = body;

    if (!email || !otp) {
      return res.json({ success: false, error: 'Email and OTP are required.' }, 400);
    }

    // --- CONFIGURATION ---
    const DB_ID = process.env.APPWRITE_DATABASE_ID || '68cc891e001ebcafceeb';
    const OTP_COLLECTION_ID = 'password_otps';
    // ---------------------

    // Hash the provided OTP for comparison
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Find the OTP record
    const otpRecords = await database.listDocuments(DB_ID, OTP_COLLECTION_ID, [
      sdk.Query.equal('email', email),
      sdk.Query.greaterThan('expiresAt', new Date().toISOString())
    ]);

    if (otpRecords.documents.length === 0) {
      return res.json({ 
        success: false, 
        error: 'OTP has expired or is invalid. Please request a new one.' 
      }, 400);
    }

    const otpRecord = otpRecords.documents[0];

    // Check if max attempts exceeded
    if (otpRecord.attempts >= 5) {
      // Delete the OTP record
      await database.deleteDocument(DB_ID, OTP_COLLECTION_ID, otpRecord.$id);
      return res.json({ 
        success: false, 
        error: 'Too many failed attempts. Please request a new OTP.' 
      }, 400);
    }

    // Verify OTP
    if (otpRecord.otpHash !== hashedOtp) {
      // Increment attempts
      await database.updateDocument(DB_ID, OTP_COLLECTION_ID, otpRecord.$id, {
        attempts: otpRecord.attempts + 1
      });
      
      const remainingAttempts = 5 - (otpRecord.attempts + 1);
      return res.json({ 
        success: false, 
        error: `Invalid OTP. ${remainingAttempts} attempts remaining.` 
      }, 400);
    }

    // OTP is valid! Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Token expires in 15 minutes
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Update the OTP record with the reset token
    await database.updateDocument(DB_ID, OTP_COLLECTION_ID, otpRecord.$id, {
      resetTokenHash: resetTokenHash,
      resetTokenExpiresAt: tokenExpiresAt,
      otpVerified: true
    });

    return res.json({ 
      success: true, 
      message: 'OTP verified successfully.',
      resetToken: resetToken,
      userId: otpRecord.userId
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.json({ success: false, error: error.message }, 500);
  }
};
