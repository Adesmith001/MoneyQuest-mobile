import { Client, Account, Databases, Storage, Functions, Query } from 'react-native-appwrite';
import {
  APPWRITE_ENDPOINT_EXPORT as APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID_EXPORT as APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID_EXPORT as APPWRITE_DATABASE_ID,
  APPWRITE_USERS_COLLECTION_ID_EXPORT as APPWRITE_USERS_COLLECTION_ID,
  APPWRITE_QUESTIONS_COLLECTION_ID_EXPORT as APPWRITE_QUESTIONS_COLLECTION_ID,
  APPWRITE_LEADERBOARD_COLLECTION_ID_EXPORT as APPWRITE_LEADERBOARD_COLLECTION_ID,
  APPWRITE_LEVELS_COLLECTION_ID_EXPORT as APPWRITE_LEVELS_COLLECTION_ID,
  APPWRITE_USER_PROGRESS_COLLECTION_ID_EXPORT as APPWRITE_USER_PROGRESS_COLLECTION_ID,
  APPWRITE_STORAGE_BUCKET_ID_EXPORT as APPWRITE_STORAGE_BUCKET_ID,
} from '../config/appwrite';

// Hardcoded fallback values for iOS standalone builds
const FALLBACK_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const FALLBACK_PROJECT_ID = '68cc6ab300330cae9c56';

// Use config values or fallbacks
const FINAL_ENDPOINT = APPWRITE_ENDPOINT || FALLBACK_ENDPOINT;
const FINAL_PROJECT_ID = APPWRITE_PROJECT_ID || FALLBACK_PROJECT_ID;

// Initialize Appwrite client with error handling
const client = new Client();

try {
  // Log configuration for debugging
  client
    .setEndpoint(FINAL_ENDPOINT)
    .setProject(FINAL_PROJECT_ID)
    .setPlatform('com.expo.moneyquest');

} catch (error) {
  console.error('❌ Failed to initialize Appwrite client:', error);
  // Try one more time with hardcoded fallbacks
  try {
    client
      .setEndpoint(FALLBACK_ENDPOINT)
      .setProject(FALLBACK_PROJECT_ID)
      .setPlatform('com.expo.moneyquest');
  } catch (fallbackError) {
    console.error('❌ Even fallback initialization failed:', fallbackError);
  }
} 

// Initialize services
export const account = new Account(client);

// Add this temporary logging to debug
export const testOAuthConfig = () => {
};

export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

// Collection IDs
export const DB_ID = APPWRITE_DATABASE_ID;
export const COLLECTIONS = {
  USERS: APPWRITE_USERS_COLLECTION_ID,
  QUESTIONS: APPWRITE_QUESTIONS_COLLECTION_ID,
  LEADERBOARD: APPWRITE_LEADERBOARD_COLLECTION_ID,
  LEVELS: APPWRITE_LEVELS_COLLECTION_ID,
  USER_PROGRESS: APPWRITE_USER_PROGRESS_COLLECTION_ID,
  STREAKS: 'streaks', // New streaks collection
};

export const STORAGE_BUCKET = APPWRITE_STORAGE_BUCKET_ID;

export { Query };
export default client;