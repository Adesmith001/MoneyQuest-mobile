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
    const { userId, resetToken, newPassword } = body;

    if (!userId || !resetToken || !newPassword) {
      return res.json({ 
        success: false, 
        error: 'User ID, reset token, and new password are required.' 
      }, 400);
    }

    // Validate password
    if (newPassword.length < 8) {
      return res.json({ 
        success: false, 
        error: 'Password must be at least 8 characters long.' 
      }, 400);
    }

    // --- CONFIGURATION ---
    const DB_ID = process.env.APPWRITE_DATABASE_ID || '68cc891e001ebcafceeb';
    const OTP_COLLECTION_ID = 'password_otps';
    // ---------------------

    // Hash the provided reset token for comparison
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Find the OTP record with valid reset token
    const otpRecords = await database.listDocuments(DB_ID, OTP_COLLECTION_ID, [
      sdk.Query.equal('userId', userId),
      sdk.Query.equal('resetTokenHash', resetTokenHash),
      sdk.Query.equal('otpVerified', true),
      sdk.Query.greaterThan('resetTokenExpiresAt', new Date().toISOString())
    ]);

    if (otpRecords.documents.length === 0) {
      return res.json({ 
        success: false, 
        error: 'Invalid or expired reset token. Please start the password reset process again.' 
      }, 400);
    }

    const otpRecord = otpRecords.documents[0];

    // Update user password using Appwrite's Users API
    await users.updatePassword(userId, newPassword);

    // Delete the OTP record (it's been used)
    await database.deleteDocument(DB_ID, OTP_COLLECTION_ID, otpRecord.$id);

    return res.json({ 
      success: true, 
      message: 'Password has been reset successfully.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    // Handle specific Appwrite errors
    if (error.code === 400) {
      return res.json({ 
        success: false, 
        error: 'Invalid password format. Please try a different password.' 
      }, 400);
    }
    
    return res.json({ success: false, error: error.message }, 500);
  }
};
