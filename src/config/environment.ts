/**
 * Environment Configuration
 * 
 * IMPORTANT: This file provides fallback values for production iOS builds
 * where react-native-dotenv doesn't work reliably.
 * 
 * For security: In a real production app, you should use EAS secrets
 * or app.json extra field. This is a workaround for the white screen issue.
 */

import { Platform } from 'react-native';

// Try to import from @env, but provide fallbacks for production builds
let envVars: Record<string, string | undefined> = {};

try {
  // This will work in development and Expo Go
  envVars = require('@env');
} catch (e) {
  console.warn('⚠️ Could not load @env module, using fallback values');
}

// Fallback values for production builds where @env doesn't work
// These are your actual production values - update them as needed
const FALLBACK_CONFIG = {
  // Appwrite Configuration
  APPWRITE_ENDPOINT: 'https://fra.cloud.appwrite.io/v1',
  APPWRITE_PROJECT_ID: '68cc6ab300330cae9c56',
  APPWRITE_DATABASE_ID: '68cc891e001ebcafceeb',
  APPWRITE_USERS_COLLECTION_ID: 'users',
  APPWRITE_QUESTIONS_COLLECTION_ID: 'questions',
  APPWRITE_LEADERBOARD_COLLECTION_ID: 'leaderboard',
  APPWRITE_LEVELS_COLLECTION_ID: 'levels',
  APPWRITE_USER_PROGRESS_COLLECTION_ID: 'user_progress',
  APPWRITE_STREAKS_COLLECTION_ID: 'streaks',
  APPWRITE_STORAGE_BUCKET_ID: '68cc9284002f457e3428',
  APPWRITE_SUBSCRIPTIONS_COLLECTION_ID: 'subscriptions',
  
  // School Subscription Collection IDs
  APPWRITE_SCHOOLS_COLLECTION_ID: 'schools',
  APPWRITE_SCHOOL_CODES_COLLECTION_ID: 'school_codes',
  APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID: 'school_students',
  APPWRITE_SCHOOL_PAYMENTS_COLLECTION_ID: 'school_payments',
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: '331361661031-6ro3pi4nn382panaieuultibmbgg48qc.apps.googleusercontent.com',
  FACEBOOK_APP_ID: '',
  TWITTER_CLIENT_ID: '',
  
  // API Configuration
  MONEYQUEST_API_BASE_URL: 'https://moneyquestproject-demo-production.up.railway.app',
  
  // KoraPay Configuration
  KORAPAY_PUBLIC_KEY: 'pk_test_QrTiUhtZTL89DRL4dUjeMvMfRNyW2rYMfx9azFsh',
  KORAPAY_SECRET_KEY: 'sk_test_65reKqgd3YWoq81tTcUYQYK6opbnWPxKHStCArF8',
  KORAPAY_MERCHANT_ID: 'KPY45665',
  KORAPAY_WEBHOOK_SECRET: '',
  KORAPAY_API_URL: 'https://api.korapay.com/merchant/api/v1',
  
  // OpenAI (optional - can be empty for production if not needed)
  OPENAI_API_KEY: '',
  AI_API_KEY: '',
  AI_API_ENDPOINT: 'https://api.openai.com/v1',
};

/**
 * Get environment variable with fallback
 */
function getEnvValue(key: string): string {
  // First try to get from @env
  const envValue = envVars[key];
  if (envValue !== undefined && envValue !== null && envValue !== '') {
    return envValue;
  }
  
  // Fall back to hardcoded values
  const fallbackValue = FALLBACK_CONFIG[key as keyof typeof FALLBACK_CONFIG];
  if (fallbackValue !== undefined) {
    return fallbackValue;
  }
  
  // Return empty string as last resort
  console.warn(`⚠️ Missing environment variable: ${key}`);
  return '';
}

// Export all environment variables with fallbacks
export const ENV = {
  // Appwrite Configuration
  APPWRITE_ENDPOINT: getEnvValue('APPWRITE_ENDPOINT'),
  APPWRITE_PROJECT_ID: getEnvValue('APPWRITE_PROJECT_ID'),
  APPWRITE_DATABASE_ID: getEnvValue('APPWRITE_DATABASE_ID'),
  APPWRITE_USERS_COLLECTION_ID: getEnvValue('APPWRITE_USERS_COLLECTION_ID'),
  APPWRITE_QUESTIONS_COLLECTION_ID: getEnvValue('APPWRITE_QUESTIONS_COLLECTION_ID'),
  APPWRITE_LEADERBOARD_COLLECTION_ID: getEnvValue('APPWRITE_LEADERBOARD_COLLECTION_ID'),
  APPWRITE_LEVELS_COLLECTION_ID: getEnvValue('APPWRITE_LEVELS_COLLECTION_ID'),
  APPWRITE_USER_PROGRESS_COLLECTION_ID: getEnvValue('APPWRITE_USER_PROGRESS_COLLECTION_ID'),
  APPWRITE_STREAKS_COLLECTION_ID: getEnvValue('APPWRITE_STREAKS_COLLECTION_ID'),
  APPWRITE_STORAGE_BUCKET_ID: getEnvValue('APPWRITE_STORAGE_BUCKET_ID'),
  APPWRITE_SUBSCRIPTIONS_COLLECTION_ID: getEnvValue('APPWRITE_SUBSCRIPTIONS_COLLECTION_ID'),
  
  // School Subscription Collection IDs
  APPWRITE_SCHOOLS_COLLECTION_ID: getEnvValue('APPWRITE_SCHOOLS_COLLECTION_ID'),
  APPWRITE_SCHOOL_CODES_COLLECTION_ID: getEnvValue('APPWRITE_SCHOOL_CODES_COLLECTION_ID'),
  APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID: getEnvValue('APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID'),
  APPWRITE_SCHOOL_PAYMENTS_COLLECTION_ID: getEnvValue('APPWRITE_SCHOOL_PAYMENTS_COLLECTION_ID'),
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: getEnvValue('GOOGLE_CLIENT_ID'),
  FACEBOOK_APP_ID: getEnvValue('FACEBOOK_APP_ID'),
  TWITTER_CLIENT_ID: getEnvValue('TWITTER_CLIENT_ID'),
  
  // API Configuration
  MONEYQUEST_API_BASE_URL: getEnvValue('MONEYQUEST_API_BASE_URL'),
  
  // KoraPay Configuration
  KORAPAY_PUBLIC_KEY: getEnvValue('KORAPAY_PUBLIC_KEY'),
  KORAPAY_SECRET_KEY: getEnvValue('KORAPAY_SECRET_KEY'),
  KORAPAY_MERCHANT_ID: getEnvValue('KORAPAY_MERCHANT_ID'),
  KORAPAY_WEBHOOK_SECRET: getEnvValue('KORAPAY_WEBHOOK_SECRET'),
  KORAPAY_API_URL: getEnvValue('KORAPAY_API_URL'),
  
  // OpenAI
  OPENAI_API_KEY: getEnvValue('OPENAI_API_KEY'),
  AI_API_KEY: getEnvValue('AI_API_KEY'),
  AI_API_ENDPOINT: getEnvValue('AI_API_ENDPOINT'),
};

// Log configuration status (only in development)
if (__DEV__) {
  console.log('📦 Environment Configuration Loaded:');
  console.log('  - APPWRITE_ENDPOINT:', ENV.APPWRITE_ENDPOINT ? '✅' : '❌');
  console.log('  - APPWRITE_PROJECT_ID:', ENV.APPWRITE_PROJECT_ID ? '✅' : '❌');
  console.log('  - MONEYQUEST_API_BASE_URL:', ENV.MONEYQUEST_API_BASE_URL ? '✅' : '❌');
}

export default ENV;
