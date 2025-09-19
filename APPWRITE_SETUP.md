# Appwrite Backend Configuration Guide

## 1. Create Appwrite Project

1. Go to [Appwrite Cloud](https://cloud.appwrite.io) or your self-hosted instance
2. Create a new project named "MoneyQuest"
3. Copy the Project ID and update it in your `.env` file

## 2. Database Setup

### Create Database
- Create a new database called "MoneyQuest"
- Copy the Database ID and update it in your `.env` file

### Collections to Create

#### 2.1 Users Collection
```json
{
  "collectionId": "users",
  "name": "Users",
  "permissions": [
    "read(\"user:USER_ID\")",
    "write(\"user:USER_ID\")"
  ],
  "attributes": [
    {
      "key": "email",
      "type": "string",
      "size": 255,
      "required": true
    },
    {
      "key": "name",
      "type": "string",
      "size": 255,
      "required": true
    },
    {
      "key": "profilePicture",
      "type": "string",
      "size": 2048,
      "required": false
    },
    {
      "key": "profilePictureId",
      "type": "string",
      "size": 255,
      "required": false
    },
    {
      "key": "xp",
      "type": "integer",
      "min": 0,
      "max": 999999999,
      "default": 0
    },
    {
      "key": "level",
      "type": "integer",
      "min": 1,
      "max": 100,
      "default": 1
    },
    {
      "key": "currentSection",
      "type": "integer",
      "min": 1,
      "max": 10,
      "default": 1
    },
    {
      "key": "streak",
      "type": "integer",
      "min": 0,
      "max": 9999,
      "default": 0
    },
    {
      "key": "lastLoginDate",
      "type": "datetime",
      "required": true
    },
    {
      "key": "totalQuestionsAnswered",
      "type": "integer",
      "min": 0,
      "default": 0
    },
    {
      "key": "correctAnswers",
      "type": "integer",
      "min": 0,
      "default": 0
    },
    {
      "key": "monthlyXP",
      "type": "integer",
      "min": 0,
      "default": 0
    },
    {
      "key": "createdAt",
      "type": "datetime",
      "required": true
    },
    {
      "key": "updatedAt",
      "type": "datetime",
      "required": true
    }
  ],
  "indexes": [
    {
      "key": "email_index",
      "type": "unique",
      "attributes": ["email"]
    },
    {
      "key": "xp_index",
      "type": "key",
      "attributes": ["xp"]
    },
    {
      "key": "level_index",
      "type": "key",
      "attributes": ["level"]
    }
  ]
}
```

#### 2.2 Questions Collection
```json
{
  "collectionId": "questions",
  "name": "Questions",
  "permissions": [
    "read(\"any\")"
  ],
  "attributes": [
    {
      "key": "level",
      "type": "integer",
      "min": 1,
      "max": 100,
      "required": true
    },
    {
      "key": "section",
      "type": "integer",
      "min": 1,
      "max": 10,
      "required": true
    },
    {
      "key": "questionText",
      "type": "string",
      "size": 2048,
      "required": true
    },
    {
      "key": "audioUrl",
      "type": "string",
      "size": 2048,
      "required": false
    },
    {
      "key": "options",
      "type": "string",
      "size": 4096,
      "required": true
    },
    {
      "key": "correctAnswer",
      "type": "string",
      "size": 512,
      "required": true
    },
    {
      "key": "xpReward",
      "type": "integer",
      "min": 1,
      "max": 100,
      "default": 10
    },
    {
      "key": "difficulty",
      "type": "string",
      "size": 20,
      "required": true
    },
    {
      "key": "topic",
      "type": "string",
      "size": 255,
      "required": true
    },
    {
      "key": "createdAt",
      "type": "datetime",
      "required": true
    }
  ],
  "indexes": [
    {
      "key": "level_section_index",
      "type": "key",
      "attributes": ["level", "section"]
    },
    {
      "key": "topic_index",
      "type": "key",
      "attributes": ["topic"]
    },
    {
      "key": "difficulty_index",
      "type": "key",
      "attributes": ["difficulty"]
    }
  ]
}
```

#### 2.3 Leaderboard Collection
```json
{
  "collectionId": "leaderboard",
  "name": "Leaderboard",
  "permissions": [
    "read(\"any\")",
    "write(\"user:USER_ID\")"
  ],
  "attributes": [
    {
      "key": "userId",
      "type": "string",
      "size": 255,
      "required": true
    },
    {
      "key": "userName",
      "type": "string",
      "size": 255,
      "required": true
    },
    {
      "key": "profilePicture",
      "type": "string",
      "size": 2048,
      "required": false
    },
    {
      "key": "monthlyXP",
      "type": "integer",
      "min": 0,
      "default": 0
    },
    {
      "key": "rank",
      "type": "integer",
      "min": 1,
      "default": 1
    },
    {
      "key": "month",
      "type": "string",
      "size": 2,
      "required": true
    },
    {
      "key": "year",
      "type": "integer",
      "min": 2024,
      "required": true
    }
  ],
  "indexes": [
    {
      "key": "monthly_ranking",
      "type": "key",
      "attributes": ["month", "year", "monthlyXP"]
    },
    {
      "key": "user_month_index",
      "type": "unique",
      "attributes": ["userId", "month", "year"]
    }
  ]
}
```

#### 2.4 Levels Collection
```json
{
  "collectionId": "levels",
  "name": "Levels",
  "permissions": [
    "read(\"any\")"
  ],
  "attributes": [
    {
      "key": "levelNumber",
      "type": "integer",
      "min": 1,
      "max": 100,
      "required": true
    },
    {
      "key": "title",
      "type": "string",
      "size": 255,
      "required": true
    },
    {
      "key": "description",
      "type": "string",
      "size": 1024,
      "required": true
    },
    {
      "key": "sections",
      "type": "string",
      "size": 4096,
      "required": true
    },
    {
      "key": "minXPRequired",
      "type": "integer",
      "min": 0,
      "default": 0
    }
  ],
  "indexes": [
    {
      "key": "level_number_index",
      "type": "unique",
      "attributes": ["levelNumber"]
    }
  ]
}
```

#### 2.5 User Progress Collection
```json
{
  "collectionId": "user_progress",
  "name": "User Progress",
  "permissions": [
    "read(\"user:USER_ID\")",
    "write(\"user:USER_ID\")"
  ],
  "attributes": [
    {
      "key": "userId",
      "type": "string",
      "size": 255,
      "required": true
    },
    {
      "key": "level",
      "type": "integer",
      "min": 1,
      "max": 100,
      "required": true
    },
    {
      "key": "section",
      "type": "integer",
      "min": 1,
      "max": 10,
      "required": true
    },
    {
      "key": "questionsAnswered",
      "type": "integer",
      "min": 0,
      "default": 0
    },
    {
      "key": "questionsCorrect",
      "type": "integer",
      "min": 0,
      "default": 0
    },
    {
      "key": "xpEarned",
      "type": "integer",
      "min": 0,
      "default": 0
    },
    {
      "key": "completedAt",
      "type": "datetime",
      "required": false
    },
    {
      "key": "isCompleted",
      "type": "boolean",
      "default": false
    }
  ],
  "indexes": [
    {
      "key": "user_progress_index",
      "type": "unique",
      "attributes": ["userId", "level", "section"]
    },
    {
      "key": "completion_index",
      "type": "key",
      "attributes": ["isCompleted"]
    }
  ]
}
```

## 3. Authentication Setup

### Enable Authentication Providers

1. Go to Auth settings in your Appwrite project
2. Enable the following providers:
   - Email/Password (already enabled by default)
   - Google OAuth2
   - Facebook OAuth2
   - Twitter OAuth2

### Configure OAuth Providers

#### Google OAuth2
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth2 credentials
5. Add your redirect URLs:
   - `https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/YOUR_PROJECT_ID`
6. Copy Client ID and Secret to Appwrite

#### Facebook OAuth2
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URLs
5. Copy App ID and Secret to Appwrite

#### Twitter OAuth2
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0
4. Configure callback URLs
5. Copy Client ID and Secret to Appwrite

## 4. Storage Setup

### Create Storage Bucket
1. Go to Storage in your Appwrite project
2. Create a new bucket called "profile_pictures"
3. Set permissions:
   - Create: `users`
   - Read: `any`
   - Update: `user:USER_ID`
   - Delete: `user:USER_ID`
4. Configure file size limits and allowed file types (jpg, png, webp)

## 5. Functions Setup (Optional)

### Monthly Leaderboard Reset Function
Create a function that runs monthly to reset the leaderboard:

```javascript
// This function should run on the 1st of every month
module.exports = async ({ req, res, log, error }) => {
  const { Client, Databases, Query } = require('node-appwrite');
  
  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);
    
  const databases = new Databases(client);
  
  try {
    // Reset all users' monthlyXP to 0
    const users = await databases.listDocuments(
      process.env.DATABASE_ID,
      'users'
    );
    
    for (const user of users.documents) {
      await databases.updateDocument(
        process.env.DATABASE_ID,
        'users',
        user.$id,
        { monthlyXP: 0 }
      );
    }
    
    log('Monthly XP reset completed successfully');
    return res.json({ success: true });
  } catch (err) {
    error('Monthly reset failed: ' + err.message);
    return res.json({ success: false, error: err.message });
  }
};
```

## 6. Environment Variables

Update your `.env` file with the actual values:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_actual_project_id
APPWRITE_DATABASE_ID=your_actual_database_id
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_QUESTIONS_COLLECTION_ID=questions
APPWRITE_LEADERBOARD_COLLECTION_ID=leaderboard
APPWRITE_LEVELS_COLLECTION_ID=levels
APPWRITE_USER_PROGRESS_COLLECTION_ID=user_progress
APPWRITE_STORAGE_BUCKET_ID=profile_pictures
```

## 7. Initial Data Population

You'll want to populate the collections with initial data:

### Sample Questions Data
Create questions for each level and section using the question generation script or manually through the Appwrite console.

### Level Configuration Data
Populate the levels collection with the predefined level structure from your constants.

This completes the Appwrite backend setup. Make sure to test all authentication flows and database operations before proceeding with the frontend implementation.