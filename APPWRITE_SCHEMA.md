# Appwrite Subscriptions Collection Schema

## Collection Details
- **Collection ID**: `subscriptions`
- **Name**: Subscriptions

## Attributes

### String Attributes
```json
{
  "key": "userId",
  "type": "string",
  "status": "available",
  "required": true,
  "array": false,
  "size": 255,
  "default": null
}

{
  "key": "planType",
  "type": "string",
  "status": "available",
  "required": true,
  "array": false,
  "size": 50,
  "default": "monthly"
}

{
  "key": "status",
  "type": "string",
  "status": "available",
  "required": true,
  "array": false,
  "size": 50,
  "default": "trial"
}

{
  "key": "korapayTransactionReference",
  "type": "string",
  "status": "available",
  "required": false,
  "array": false,
  "size": 255,
  "default": null
}

{
  "key": "korapayCustomerReference",
  "type": "string",
  "status": "available",
  "required": false,
  "array": false,
  "size": 255,
  "default": null
}

{
  "key": "currency",
  "type": "string",
  "status": "available",
  "required": true,
  "array": false,
  "size": 10,
  "default": "NGN"
}
```

### DateTime Attributes
```json
{
  "key": "trialStartDate",
  "type": "datetime",
  "status": "available",
  "required": true,
  "array": false,
  "default": null
}

{
  "key": "trialEndDate",
  "type": "datetime",
  "status": "available",
  "required": true,
  "array": false,
  "default": null
}

{
  "key": "subscriptionStartDate",
  "type": "datetime",
  "status": "available",
  "required": false,
  "array": false,
  "default": null
}

{
  "key": "subscriptionEndDate",
  "type": "datetime",
  "status": "available",
  "required": false,
  "array": false,
  "default": null
}

{
  "key": "lastPaymentDate",
  "type": "datetime",
  "status": "available",
  "required": false,
  "array": false,
  "default": null
}

{
  "key": "nextBillingDate",
  "type": "datetime",
  "status": "available",
  "required": false,
  "array": false,
  "default": null
}

{
  "key": "createdAt",
  "type": "datetime",
  "status": "available",
  "required": true,
  "array": false,
  "default": null
}

{
  "key": "updatedAt",
  "type": "datetime",
  "status": "available",
  "required": true,
  "array": false,
  "default": null
}
```

### Integer Attributes
```json
{
  "key": "amount",
  "type": "integer",
  "status": "available",
  "required": true,
  "array": false,
  "min": 0,
  "max": 999999999,
  "default": 0
}
```

### Boolean Attributes
```json
{
  "key": "autoRenew",
  "type": "boolean",
  "status": "available",
  "required": true,
  "array": false,
  "default": false
}
```

## Indexes

### Index 1: userId
```json
{
  "key": "userId_index",
  "type": "key",
  "status": "available",
  "attributes": ["userId"],
  "orders": ["ASC"]
}
```

### Index 2: status
```json
{
  "key": "status_index",
  "type": "key",
  "status": "available",
  "attributes": ["status"],
  "orders": ["ASC"]
}
```

### Index 3: userId + status (Compound)
```json
{
  "key": "userId_status_index",
  "type": "key",
  "status": "available",
  "attributes": ["userId", "status"],
  "orders": ["ASC", "ASC"]
}
```

### Index 4: createdAt
```json
{
  "key": "createdAt_index",
  "type": "key",
  "status": "available",
  "attributes": ["createdAt"],
  "orders": ["DESC"]
}
```

## Permissions

### Document Security
```
Create Documents: users
Read Documents: user:$userId
Update Documents: user:$userId
Delete Documents: none (or admins only)
```

### Detailed Permission Rules:
```
Create:
  - Any authenticated user can create their subscription
  - Rule: "users" (any logged-in user)

Read:
  - Users can only read their own subscriptions
  - Rule: attribute("userId") == $userId

Update:
  - Users can only update their own subscriptions
  - Rule: attribute("userId") == $userId

Delete:
  - No one can delete (or only admins)
  - Rule: none
```

## Quick Setup via Appwrite Console

1. **Navigate to Database**
   - Open Appwrite Console
   - Go to Databases → Your Database

2. **Create Collection**
   - Click "Add Collection"
   - Name: "Subscriptions"
   - Collection ID: `subscriptions`

3. **Add Each Attribute**
   - Click "Add Attribute"
   - Copy values from above
   - Repeat for all attributes

4. **Create Indexes**
   - Go to "Indexes" tab
   - Add each index from above

5. **Set Permissions**
   - Go to "Settings" tab
   - Configure permissions as specified

## Appwrite CLI Setup (Alternative)

If you prefer using CLI:

```bash
# Create collection
appwrite databases createCollection \
  --databaseId "YOUR_DATABASE_ID" \
  --collectionId "subscriptions" \
  --name "Subscriptions" \
  --permissions "create('users')"

# Add attributes (repeat for each)
appwrite databases createStringAttribute \
  --databaseId "YOUR_DATABASE_ID" \
  --collectionId "subscriptions" \
  --key "userId" \
  --size 255 \
  --required true

# ... (repeat for all attributes)

# Create index
appwrite databases createIndex \
  --databaseId "YOUR_DATABASE_ID" \
  --collectionId "subscriptions" \
  --key "userId_index" \
  --type "key" \
  --attributes "userId" \
  --orders "ASC"

# ... (repeat for all indexes)
```

## Verification

After setup, verify:
1. ✅ Collection named "subscriptions" exists
2. ✅ All 16 attributes are present
3. ✅ All 4 indexes are created
4. ✅ Permissions are set correctly
5. ✅ Test by creating a document manually

## Testing the Collection

Create a test document:
```json
{
  "userId": "test_user_id",
  "planType": "monthly",
  "status": "trial",
  "trialStartDate": "2026-01-06T00:00:00.000Z",
  "trialEndDate": "2026-02-05T00:00:00.000Z",
  "autoRenew": false,
  "amount": 0,
  "currency": "NGN",
  "createdAt": "2026-01-06T00:00:00.000Z",
  "updatedAt": "2026-01-06T00:00:00.000Z"
}
```

If successful, your collection is ready! 🎉
