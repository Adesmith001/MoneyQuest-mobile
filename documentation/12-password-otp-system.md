# Password OTP System Setup Guide

This guide explains how to set up the OTP-based password reset flow for MoneyQuest.

## 1. Create Appwrite Collection

In your Appwrite Console, create a new collection called `password_otps` with the following attributes:

### Collection Settings
- **Collection ID**: `password_otps`
- **Name**: Password OTPs
- **Permissions**: 
  - No permissions needed (functions use API key)

### Attributes

| Attribute Name | Type | Size | Required | Default |
|---------------|------|------|----------|---------|
| `userId` | String | 36 | Yes | - |
| `email` | String | 320 | Yes | - |
| `otpHash` | String | 64 | Yes | - |
| `expiresAt` | DateTime | - | Yes | - |
| `attempts` | Integer | - | Yes | 0 |
| `createdAt` | DateTime | - | Yes | - |
| `resetTokenHash` | String | 64 | No | - |
| `resetTokenExpiresAt` | DateTime | - | No | - |
| ` ` | Boolean | - | No | false |

### Indexes

| Key | Type | Attributes |
|-----|------|------------|
| `userId_idx` | Key | userId |
| `email_idx` | Key | email |
| `expires_idx` | Key | expiresAt |

---

## 2. Deploy Appwrite Functions

### Function 1: sendPasswordOTP

1. Go to **Functions** in Appwrite Console
2. Click **Create Function**
3. Settings:
   - **Name**: Send Password OTP
   - **Function ID**: `sendPasswordOTP`
   - **Runtime**: Node.js 18.0
   - **Execute Access**: Any (guests need to request password reset)

4. Deploy the code from `appwrite/functions/sendPasswordOTP/`

5. Add Environment Variables:
   ```
   APPWRITE_FUNCTION_ENDPOINT=https://fra.cloud.appwrite.io/v1
   APPWRITE_FUNCTION_PROJECT_ID=<your-project-id>
   APPWRITE_FUNCTION_API_KEY=<your-api-key>
   APPWRITE_DATABASE_ID=<your-database-id>
   
   # For email sending (optional - choose one provider)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="MoneyQuest" <noreply@moneyquest.app>
   ```

### Function 2: verifyPasswordOTP

1. Create another function
2. Settings:
   - **Name**: Verify Password OTP
   - **Function ID**: `verifyPasswordOTP`
   - **Runtime**: Node.js 18.0
   - **Execute Access**: Any

3. Deploy the code from `appwrite/functions/verifyPasswordOTP/`

4. Add same environment variables as above (except SMTP)

### Function 3: resetPasswordWithToken

1. Create another function
2. Settings:
   - **Name**: Reset Password With Token
   - **Function ID**: `resetPasswordWithToken`
   - **Runtime**: Node.js 18.0
   - **Execute Access**: Any

3. Deploy the code from `appwrite/functions/resetPasswordWithToken/`

4. Add same environment variables as above (except SMTP)

---

## 3. Create API Key

You need an API key with the following permissions:

- **users.read** - To find user by email
- **users.write** - To update user password
- **documents.read** - To read OTP records
- **documents.write** - To create/update/delete OTP records

---

## 4. Email Configuration Options

### Option A: Gmail SMTP (Development/Testing)
1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in SMTP_PASS

### Option B: SendGrid (Production)
Replace the nodemailer section in sendPasswordOTP with:
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: email,
  from: 'noreply@moneyquest.app',
  subject: 'MoneyQuest - Password Reset OTP',
  html: emailHtml,
});
```

### Option C: Mailgun, AWS SES, etc.
Similar setup with their respective SDKs.

---

## 5. Testing

1. Run the app and go to Forgot Password
2. Enter your email
3. Check your email for the 6-digit OTP
4. Enter the OTP in the app
5. Create a new password

---

## 6. Security Notes

- OTPs expire after 10 minutes
- Maximum 5 failed attempts per OTP
- Reset tokens expire after 15 minutes
- All OTPs are hashed (SHA-256) before storage
- OTP records are deleted after successful password reset
