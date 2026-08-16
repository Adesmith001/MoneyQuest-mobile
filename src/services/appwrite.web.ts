import { Client, Account, Databases, Storage, Functions, Query } from 'appwrite';
import {
  APPWRITE_ENDPOINT_EXPORT as APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID_EXPORT as APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID_EXPORT as APPWRITE_DATABASE_ID,
  APPWRITE_USERS_COLLECTION_ID_EXPORT as APPWRITE_USERS_COLLECTION_ID,
  APPWRITE_QUESTIONS_COLLECTION_ID_EXPORT as APPWRITE_QUESTIONS_COLLECTION_ID,
  APPWRITE_LEADERBOARD_COLLECTION_ID_EXPORT as APPWRITE_LEADERBOARD_COLLECTION_ID,
  APPWRITE_LEVELS_COLLECTION_ID_EXPORT as APPWRITE_LEVELS_COLLECTION_ID,
  APPWRITE_USER_PROGRESS_COLLECTION_ID_EXPORT as APPWRITE_USER_PROGRESS_COLLECTION_ID,
  APPWRITE_ANALYTICS_COLLECTION_ID_EXPORT as APPWRITE_ANALYTICS_COLLECTION_ID,
  APPWRITE_SUBSCRIPTIONS_COLLECTION_ID_EXPORT as APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
  APPWRITE_BROADCASTS_COLLECTION_ID_EXPORT as APPWRITE_BROADCASTS_COLLECTION_ID,
  APPWRITE_ADMIN_ACCESS_GRANTS_COLLECTION_ID_EXPORT as APPWRITE_ADMIN_ACCESS_GRANTS_COLLECTION_ID,
  APPWRITE_STORAGE_BUCKET_ID_EXPORT as APPWRITE_STORAGE_BUCKET_ID,
} from '../config/appwrite';

/**
 * Web variant of the Appwrite client.
 *
 * Uses the official `appwrite` JS SDK (cookie-based sessions, Blob/File
 * uploads) instead of `react-native-appwrite` (which targets React Native's
 * `{ uri, name, type }` file objects and native session storage).
 *
 * Metro resolves this file for web bundles (appwrite.web.ts wins over
 * appwrite.ts on `web`); native bundles keep the react-native-appwrite
 * implementation. The exported API surface is identical, so call sites are
 * platform-agnostic.
 */

// Initialize Appwrite client with error handling
const client = new Client();

if (APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID) {
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);
  // NOTE: no setPlatform() on web — sessions are cookie-based and the
  // browser origin must be registered in Appwrite's Allowed Domains.
}

// Initialize services
export const account = new Account(client);
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
  SUBSCRIPTIONS: APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
  BROADCASTS: APPWRITE_BROADCASTS_COLLECTION_ID,
  ADMIN_ACCESS_GRANTS: APPWRITE_ADMIN_ACCESS_GRANTS_COLLECTION_ID,
  ANALYTICS_EVENTS: APPWRITE_ANALYTICS_COLLECTION_ID || 'analytics_events',
};

export const STORAGE_BUCKET = APPWRITE_STORAGE_BUCKET_ID;

export { Query };
export default client;
