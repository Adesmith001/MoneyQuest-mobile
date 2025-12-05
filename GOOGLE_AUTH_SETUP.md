# Google Sign-In & Password Reset Setup Guide

## Overview
This guide explains how to set up Google Sign-In and Forgot Password functionality in MoneyQuest.

---

## 🔐 Forgot Password Setup

### How It Works
1. User enters email address
2. Appwrite sends password reset email with deep link
3. User clicks link in email → App opens automatically
4. User enters new password
5. Password is updated in Appwrite

### Configuration Steps

#### 1. Deep Link Configuration (Already Done ✅)
The following has been configured in `app.json`:
```json
{
  "scheme": "moneyquest",
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          {
            "scheme": "moneyquest",
            "host": "*"
          },
          {
            "scheme": "https",
            "host": "moneyquest.app",
            "pathPrefix": "/reset-password"
          }
        ],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

#### 2. Appwrite Console Configuration
You need to configure the password reset URL in Appwrite:

1. Go to **Appwrite Console** → Your Project
2. Navigate to **Auth** → **Settings** → **Security**
3. Find **Password Recovery URL**
4. Set it to: `moneyquest://reset-password`
5. Click **Update**

#### 3. Testing Password Reset

**Development Testing:**
```bash
# Run the app
npx expo start

# When email is sent, you'll get a link like:
# moneyquest://reset-password/USER_ID/SECRET_TOKEN

# Test the deep link manually:
npx uri-scheme open "moneyquest://reset-password/test-user-id/test-secret" --android
# or
npx uri-scheme open "moneyquest://reset-password/test-user-id/test-secret" --ios
```

**Production Testing:**
1. Enter a real email in forgot password screen
2. Check email inbox (and spam folder)
3. Click the reset link
4. App should open automatically to "Create New Password" screen

---

## 🔵 Google Sign-In Setup

### How It Works
1. User clicks "Sign in with Google" button
2. Browser opens with Google OAuth consent screen
3. User signs in and grants permissions
4. App receives OAuth token via deep link
5. User is authenticated and redirected to main app

### Prerequisites
- Google Cloud Console project
- OAuth 2.0 credentials

### Configuration Steps

#### 1. Google Cloud Console Setup

**A. Create OAuth Credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**:
   - Navigate to **APIs & Services** → **Library**
   - Search "Google+ API"
   - Click **Enable**

4. Create OAuth 2.0 Credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   
   **For Android:**
   - Application type: **Android**
   - Package name: `com.expo.moneyquest` (from app.json)
   - SHA-1 certificate fingerprint:
     ```bash
     # Development - Get from Expo:
     expo credentials:manager -p android
     
     # Or generate manually:
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   
   **For iOS:**
   - Application type: **iOS**
   - Bundle ID: `com.expo.moneyquest`

   **For Web (optional):**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `https://auth.expo.io/@YOUR_EXPO_USERNAME/moneyquest`
     - `exp://localhost:8081`

5. Copy the **Client IDs** for each platform

#### 2. Appwrite OAuth Configuration

1. Go to **Appwrite Console** → Your Project
2. Navigate to **Auth** → **Settings** → **OAuth2 Providers**
3. Find **Google** and click **Edit**
4. Enable Google OAuth
5. Enter your **OAuth credentials**:
   - App ID: Your Google Client ID (Web)
   - App Secret: Your Google Client Secret
6. Set **Redirect URLs**:
   ```
   moneyquest://oauth/success
   moneyquest://oauth/failure
   exp://localhost:8081/--/oauth/success
   exp://localhost:8081/--/oauth/failure
   ```
7. Click **Update**

#### 3. Environment Variables (Optional)

Add to your `.env` file:
```env
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

#### 4. Install Required Packages

```bash
# Install OAuth dependencies
pnpm add expo-auth-session expo-crypto

# Rebuild the app
npx expo prebuild --clean
```

#### 5. Test Google Sign-In

**Development:**
```bash
# Start the development server
npx expo start

# Test on physical device (emulator may not work properly)
# Scan QR code with Expo Go or build development client
```

**Important Notes:**
- Google Sign-In **requires a physical device** or development build
- Expo Go has limitations with OAuth
- For production, build standalone app with EAS Build

---

## 🚀 Building for Production

### Development Build (Recommended for Testing)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build development client
eas build --profile development --platform android
eas build --profile development --platform ios
```

### Production Build
```bash
# Build for production
eas build --profile production --platform android
eas build --profile production --platform ios

# Submit to stores
eas submit -p android
eas submit -p ios
```

---

## 🧪 Testing Checklist

### Forgot Password Flow
- [ ] User can enter email and receive reset link
- [ ] Email contains working deep link
- [ ] App opens when deep link is clicked
- [ ] User can set new password
- [ ] New password works for login

### Google Sign-In Flow
- [ ] Google button opens browser with consent screen
- [ ] User can sign in with Google account
- [ ] App redirects back after successful sign-in
- [ ] User profile is created/updated in database
- [ ] User is authenticated and sees main screen

---

## 🐛 Troubleshooting

### Forgot Password Issues

**Problem: Email not received**
- Check Appwrite SMTP settings
- Check spam folder
- Verify email address is correct
- Check Appwrite logs for errors

**Problem: Deep link doesn't open app**
- Verify `app.json` scheme configuration
- Rebuild the app after changing `app.json`
- Test with `npx uri-scheme open` command
- Check that app is installed

**Problem: "Invalid recovery token" error**
- Token expires after 24 hours
- Request new password reset
- Check that userId and secret are passed correctly

### Google Sign-In Issues

**Problem: "Sign-in failed" error**
- Verify Google OAuth credentials in Appwrite
- Check that redirect URLs match exactly
- Ensure Google+ API is enabled
- Check package name matches in Google Console

**Problem: Browser opens but doesn't redirect back**
- Verify deep link configuration
- Check redirect URLs in Appwrite
- Ensure app is registered for deep links
- Try on physical device instead of emulator

**Problem: "User already exists" error**
- Email is already registered with password
- User should use email/password login
- Or implement account linking

---

## 📱 Platform-Specific Notes

### Android
- Deep links work automatically after install
- May need to set default app for links
- Test on API 23+ (Android 6.0+)

### iOS
- Universal Links require HTTPS domain
- Custom URL scheme works without HTTPS
- Test on iOS 11+ for best compatibility

---

## 🔗 Useful Links

- [Appwrite OAuth Docs](https://appwrite.io/docs/client/account#accountCreateOAuth2Session)
- [Expo Deep Linking Guide](https://docs.expo.dev/guides/deep-linking/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [React Native Appwrite](https://appwrite.io/docs/getting-started-for-react-native)

---

## 📝 Implementation Files Changed

### Modified Files:
1. `src/services/auth.ts` - Updated recovery URL
2. `src/navigation/AppNavigator.tsx` - Added OAuth callback handling and deep link listener
3. `src/store/slices/authSlice.ts` - Updated Google auth to use new service
4. `src/screens/auth/LoginScreen.tsx` - Uncommented social login buttons
5. `app.json` - Enhanced deep link configuration

### New Files:
1. `src/services/googleAuth.ts` - Dedicated Google OAuth service

---

## ✅ Quick Start Commands

```bash
# Install dependencies
pnpm install

# Install OAuth packages
pnpm add expo-auth-session expo-crypto

# Start development server
npx expo start

# Build development client
eas build --profile development --platform android

# Test deep link
npx uri-scheme open "moneyquest://reset-password/test/token" --android
```

---

## 🎯 Next Steps

1. **Configure Appwrite Console**:
   - Set password recovery URL
   - Enable Google OAuth
   - Add redirect URLs

2. **Set up Google Cloud Console**:
   - Create OAuth credentials
   - Get SHA-1 fingerprint
   - Configure consent screen

3. **Test on Physical Device**:
   - Build development client
   - Install on device
   - Test both flows

4. **Deploy to Production**:
   - Build production app
   - Submit to app stores
   - Test with real users

---

**Need Help?** Check Appwrite logs and console errors for detailed error messages.
