# KoraPay Webhook Handler

This Appwrite Function handles KoraPay payment webhooks securely.

## Features
- Validates webhook signatures
- Verifies payment amounts
- Activates subscriptions after successful payment
- Handles payment failures

## Environment Variables Required
- `APPWRITE_DATABASE_ID` - Your Appwrite database ID
- `APPWRITE_SUBSCRIPTIONS_COLLECTION_ID` - Subscriptions collection ID
- `KORAPAY_WEBHOOK_SECRET` - Your KoraPay webhook secret
- `APPWRITE_API_KEY` - Server API key with proper permissions

## Setup
1. Deploy this function to Appwrite
2. Set up a webhook in KoraPay dashboard pointing to: `https://[your-appwrite-endpoint]/v1/functions/[function-id]/executions`
3. Add required environment variables in Appwrite Console

## Security
- All payment verification happens server-side
- Webhook signatures are validated
- Payment amounts are verified against plan prices
