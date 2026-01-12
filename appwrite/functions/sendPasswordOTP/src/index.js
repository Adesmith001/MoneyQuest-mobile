const sdk = require('node-appwrite');

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
    const { email } = body;

    if (!email) {
      return res.json({ success: false, error: 'Email is required.' }, 400);
    }

    // --- CONFIGURATION ---
    const DB_ID = process.env.APPWRITE_DATABASE_ID || '68cc891e001ebcafceeb';
    const OTP_COLLECTION_ID = 'password_otps'; // You need to create this collection
    // ---------------------

    // Find user by email using the Users API
    const usersList = await users.list([
      sdk.Query.equal('email', email)
    ]);

    if (usersList.users.length === 0) {
      // Don't reveal if user exists or not for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, an OTP will be sent.' 
      });
    }

    const user = usersList.users[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // OTP expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any existing OTP for this user
    try {
      const existingOtps = await database.listDocuments(DB_ID, OTP_COLLECTION_ID, [
        sdk.Query.equal('userId', user.$id)
      ]);
      
      for (const doc of existingOtps.documents) {
        await database.deleteDocument(DB_ID, OTP_COLLECTION_ID, doc.$id);
      }
    } catch (e) {
      // Collection might not exist yet or no documents
      console.log('No existing OTPs to delete:', e.message);
    }

    // Store OTP in database (hashed for security)
    const crypto = require('crypto');
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    await database.createDocument(DB_ID, OTP_COLLECTION_ID, sdk.ID.unique(), {
      userId: user.$id,
      email: email,
      otpHash: hashedOtp,
      expiresAt: expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString()
    });

    // Send email using Appwrite's built-in messaging or your preferred email service
    // Option 1: Use a third-party email service (recommended)
    // Option 2: Use Appwrite Messaging (if configured)
    
    // For now, we'll use a simple HTTP request to an email service
    // You can replace this with your preferred email provider (SendGrid, Mailgun, etc.)
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">MoneyQuest Password Reset</h2>
        <p>Hello,</p>
        <p>You requested to reset your password. Use the following OTP code:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h1 style="color: #333; letter-spacing: 8px; margin: 0;">${otp}</h1>
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br/>The MoneyQuest Team</p>
      </div>
    `;

    // If you have SMTP configured in environment variables
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"MoneyQuest" <noreply@moneyquest.app>',
        to: email,
        subject: 'MoneyQuest - Password Reset OTP',
        html: emailHtml,
      });
    } else {
      // Fallback: Log the OTP for testing (remove in production!)
      console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
      
      // You should implement your email sending logic here
      // For example, using SendGrid, Mailgun, AWS SES, etc.
    }

    return res.json({ 
      success: true, 
      message: 'OTP sent successfully.',
      // Don't send OTP in response in production!
      // This is just for testing:
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp })
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return res.json({ success: false, error: error.message }, 500);
  }
};
