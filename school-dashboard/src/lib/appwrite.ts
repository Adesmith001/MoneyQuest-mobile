import { Client, Databases, Account, Functions, ID, Query } from 'appwrite';
import { config } from '../config';

// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint(config.appwrite.endpoint)
  .setProject(config.appwrite.projectId);

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

export { ID, Query };
export default client;
