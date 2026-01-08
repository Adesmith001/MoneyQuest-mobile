# School Subscription System - Appwrite Schema

## Overview
This document outlines the Appwrite collections needed for the school subscription system.

---

## Collection 1: Schools

### Collection Details
- **Collection ID**: `schools`
- **Name**: Schools

### Attributes

```json
{
  "key": "name",
  "type": "string",
  "required": true,
  "size": 255,
  "description": "School name"
}

{
  "key": "email",
  "type": "string",
  "required": true,
  "size": 255,
  "description": "School admin email (used for login)"
}

{
  "key": "passwordHash",
  "type": "string",
  "required": true,
  "size": 255,
  "description": "Hashed password for school admin"
}

{
  "key": "contactPerson",
  "type": "string",
  "required": true,
  "size": 255,
  "description": "Name of contact person"
}

{
  "key": "phoneNumber",
  "type": "string",
  "required": false,
  "size": 50,
  "description": "Contact phone number"
}

{
  "key": "address",
  "type": "string",
  "required": false,
  "size": 500,
  "description": "School address"
}

{
  "key": "city",
  "type": "string",
  "required": false,
  "size": 100,
  "description": "City"
}

{
  "key": "state",
  "type": "string",
  "required": false,
  "size": 100,
  "description": "State/Province"
}

{
  "key": "country",
  "type": "string",
  "required": true,
  "size": 100,
  "default": "Nigeria"
}

{
  "key": "logo",
  "type": "string",
  "required": false,
  "size": 500,
  "description": "URL to school logo"
}

{
  "key": "status",
  "type": "string",
  "required": true,
  "size": 50,
  "default": "active",
  "description": "active | suspended | pending"
}

{
  "key": "totalSeatsEverPurchased",
  "type": "integer",
  "required": true,
  "default": 0,
  "description": "Total seats ever purchased"
}

{
  "key": "createdAt",
  "type": "datetime",
  "required": true
}

{
  "key": "updatedAt",
  "type": "datetime",
  "required": true
}
```

### Indexes
```json
{
  "key": "email_index",
  "type": "unique",
  "attributes": ["email"]
}

{
  "key": "status_index",
  "type": "key",
  "attributes": ["status"]
}
```

---

## Collection 2: School Codes

### Collection Details
- **Collection ID**: `school_codes`
- **Name**: School Codes

### Attributes

```json
{
  "key": "schoolId",
  "type": "string",
  "required": true,
  "size": 255,
  "description": "Reference to schools collection"
}

{
  "key": "code",
  "type": "string",
  "required": true,
  "size": 50,
  "description": "Unique enrollment code (e.g., ABC123XY)"
}

{
  "key": "name",
  "type": "string",
  "required": true,
  "size": 255,
  "description": "Code name for identification (e.g., 'Class 2025 Batch A')"
}

{
  "key": "seatsPurchased",
  "type": "integer",
  "required": true,
  "min": 1,
  "max": 10000,
  "description": "Number of seats purchased"
}

{
  "key": "seatsUsed",
  "type": "integer",
  "required": true,
  "default": 0,
  "description": "Number of seats currently used"
}

{
  "key": "planType",
  "type": "string",
  "required": true,
  "size": 50,
  "default": "annual",
  "description": "monthly | annual"
}

{
  "key": "status",
  "type": "string",
  "required": true,
  "size": 50,
  "default": "active",
  "description": "active | expired | suspended | depleted"
}

{
  "key": "expirationDate",
  "type": "datetime",
  "required": true,
  "description": "When the code expires"
}

{
  "key": "activationDate",
  "type": "datetime",
  "required": true,
  "description": "When the code was activated"
}

{
  "key": "paymentReference",
  "type": "string",
  "required": false,
  "size": 255,
  "description": "KoraPay transaction reference"
}

{
  "key": "amount",
  "type": "integer",
  "required": true,
  "description": "Total amount paid for this code"
}

{
  "key": "pricePerSeat",
  "type": "integer",
  "required": true,
  "description": "Price per seat at time of purchase"
}

{
  "key": "currency",
  "type": "string",
  "required": true,
  "size": 10,
  "default": "NGN"
}

{
  "key": "createdAt",
  "type": "datetime",
  "required": true
}

{
  "key": "updatedAt",
  "type": "datetime",
  "required": true
}
```

### Indexes
```json
{
  "key": "code_index",
  "type": "unique",
  "attributes": ["code"]
}

{
  "key": "schoolId_index",
  "type": "key",
  "attributes": ["schoolId"]
}

{
  "key": "status_index",
  "type": "key",
  "attributes": ["status"]
}

{
  "key": "schoolId_status_index",
  "type": "key",
  "attributes": ["schoolId", "status"]
}
```

---

## Collection 3: School Students

### Collection Details
- **Collection ID**: `school_students`
- **Name**: School Students

### Attributes

```json
{
  "key": "userId",
  "type": "string",
  "required": true,
  "size": 255,
  "description": "Reference to users collection (MoneyQuest user)"
}

{
  "key": "schoolId",
  "type": "string",
  "required": true,
  "size": 255,
  "description": "Reference to schools collection"
}

{
  "key": "codeId",
  "type": "string",
  "required": true,
  "size": 255,
  "description": "Reference to school_codes collection"
}

{
  "key": "enrolledAt",
  "type": "datetime",
  "required": true,
  "description": "When student enrolled with code"
}

{
  "key": "expiresAt",
  "type": "datetime",
  "required": true,
  "description": "When student's access expires (matches code expiration)"
}

{
  "key": "status",
  "type": "string",
  "required": true,
  "size": 50,
  "default": "active",
  "description": "active | expired | revoked"
}

{
  "key": "createdAt",
  "type": "datetime",
  "required": true
}

{
  "key": "updatedAt",
  "type": "datetime",
  "required": true
}
```

### Indexes
```json
{
  "key": "userId_index",
  "type": "unique",
  "attributes": ["userId"],
  "description": "One student can only be enrolled once"
}

{
  "key": "schoolId_index",
  "type": "key",
  "attributes": ["schoolId"]
}

{
  "key": "codeId_index",
  "type": "key",
  "attributes": ["codeId"]
}

{
  "key": "status_index",
  "type": "key",
  "attributes": ["status"]
}
```

---

## Collection 4: School Payments (Audit Trail)

### Collection Details
- **Collection ID**: `school_payments`
- **Name**: School Payments

### Attributes

```json
{
  "key": "schoolId",
  "type": "string",
  "required": true,
  "size": 255
}

{
  "key": "codeId",
  "type": "string",
  "required": false,
  "size": 255,
  "description": "Reference to generated code (if applicable)"
}

{
  "key": "transactionReference",
  "type": "string",
  "required": true,
  "size": 255
}

{
  "key": "amount",
  "type": "integer",
  "required": true
}

{
  "key": "currency",
  "type": "string",
  "required": true,
  "size": 10,
  "default": "NGN"
}

{
  "key": "seats",
  "type": "integer",
  "required": true
}

{
  "key": "planType",
  "type": "string",
  "required": true,
  "size": 50
}

{
  "key": "status",
  "type": "string",
  "required": true,
  "size": 50,
  "description": "pending | success | failed"
}

{
  "key": "paymentMethod",
  "type": "string",
  "required": false,
  "size": 50,
  "description": "card | bank_transfer | etc"
}

{
  "key": "paidAt",
  "type": "datetime",
  "required": false
}

{
  "key": "createdAt",
  "type": "datetime",
  "required": true
}
```

### Indexes
```json
{
  "key": "schoolId_index",
  "type": "key",
  "attributes": ["schoolId"]
}

{
  "key": "transactionReference_index",
  "type": "unique",
  "attributes": ["transactionReference"]
}

{
  "key": "status_index",
  "type": "key",
  "attributes": ["status"]
}
```

---

## Pricing Configuration

### School Seat Pricing (NGN)

| Plan Type | Price Per Seat | Minimum Seats | Discount Tiers |
|-----------|----------------|---------------|----------------|
| Monthly   | ₦2,500         | 10            | 50+: 10% off, 100+: 15% off, 500+: 20% off |
| Annual    | ₦25,000        | 10            | 50+: 10% off, 100+: 15% off, 500+: 20% off |

---

## Quick Setup Commands

### Create Collections via Appwrite Console

1. Go to Appwrite Console → Databases → Your Database
2. Create each collection with the IDs specified above
3. Add all attributes as defined
4. Create indexes as specified
5. Set permissions:
   - Schools: Admin only for create/delete, school owner for read/update
   - School Codes: School owner only
   - School Students: School owner + student for read
   - School Payments: School owner for read only

---

## Environment Variables to Add

Add these to your `.env` file:

```env
APPWRITE_SCHOOLS_COLLECTION_ID=schools
APPWRITE_SCHOOL_CODES_COLLECTION_ID=school_codes
APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID=school_students
APPWRITE_SCHOOL_PAYMENTS_COLLECTION_ID=school_payments
```

---

## Notes

1. **Code Generation**: Codes are 8-character alphanumeric strings (e.g., `MQ-ABC12XY`)
2. **Seat Management**: When a student enrolls, `seatsUsed` increments; when revoked, it decrements
3. **Expiration Handling**: Background function should check and update expired codes/enrollments
4. **Security**: School passwords are hashed server-side; never stored in plain text
