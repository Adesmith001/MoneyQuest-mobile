import { strict as assert } from 'node:assert';
import { findOrCreateUserDocument } from '../src/services/authProfile';

const accountInfo = {
  $id: 'auth-user-1',
  email: 'user@example.com',
  name: 'Example User',
};

async function testReturnsExistingUserDocument() {
  let createCalled = false;
  const existingDoc = { $id: 'auth-user-1', email: accountInfo.email, name: accountInfo.name };
  const databases = {
    async getDocument() {
      return existingDoc;
    },
    async createDocument() {
      createCalled = true;
      throw new Error('should not create');
    },
  };

  const result = await findOrCreateUserDocument({
    databases,
    dbId: 'db',
    usersCollectionId: 'users',
    accountInfo,
  });

  assert.equal(result, existingDoc, 'returns the existing profile document');
  assert.equal(createCalled, false, 'does not create a duplicate profile document');
}

async function testCreatesMissingUserDocument() {
  let createdPayload: Record<string, unknown> | null = null;
  const databases = {
    async getDocument() {
      const error = new Error('not found') as Error & { code?: number };
      error.code = 404;
      throw error;
    },
    async createDocument(
      dbId: string,
      collectionId: string,
      documentId: string,
      payload: Record<string, unknown>
    ) {
      createdPayload = payload;
      return { $id: documentId, ...payload };
    },
  };

  const result = await findOrCreateUserDocument({
    databases,
    dbId: 'db',
    usersCollectionId: 'users',
    accountInfo,
    profileSeed: {
      username: 'ExampleUser',
      phoneNumber: '+2348000000000',
    },
  });

  assert.equal(result.$id, accountInfo.$id, 'uses Appwrite auth user id as the profile document id');
  assert.equal(result.email, accountInfo.email, 'copies the account email');
  assert.equal(result.name, accountInfo.name, 'copies the account name');
  assert.equal(result.username, 'exampleuser', 'normalizes usernames before creating repaired profiles');
  assert.equal(result.phoneNumber, '+2348000000000', 'preserves optional seeded fields');
  assert.ok(createdPayload, 'creates a replacement profile document when it is missing');
}

Promise.resolve()
  .then(testReturnsExistingUserDocument)
  .then(testCreatesMissingUserDocument)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
