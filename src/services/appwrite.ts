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

// Initialize Appwrite client
const client = new Client();

// Log configuration for debugging
console.log('Appwrite Configuration:');
console.log('Endpoint:', APPWRITE_ENDPOINT);
console.log('Project ID:', APPWRITE_PROJECT_ID);

client
  .setEndpoint(APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(APPWRITE_PROJECT_ID);

// Initialize services
export const account = new Account(client);

// Add this temporary logging to debug
export const testOAuthConfig = () => {
  console.log('Appwrite Endpoint:', APPWRITE_ENDPOINT);
  console.log('Appwrite Project ID:', APPWRITE_PROJECT_ID);
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