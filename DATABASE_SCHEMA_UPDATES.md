# Database Schema Updates for User Onboarding

## Required Fields to Add to User Collection

The following fields should be added to your user database schema to support the new onboarding flow:

### Core User Fields (Updated)
```typescript
interface User {
  // Existing fields...
  $id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  profilePicture?: string;
  profilePictureId?: string;
  xp: number;
  level: number;
  currentSection: number;
  streak: number;
  lastLoginDate: string;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  monthlyXP: number;
  $createdAt: string;  
  $updatedAt: string;

  // NEW ONBOARDING FIELDS
  username?: string;           // Unique username for the user
  age?: number;               // User's age (7-100)
  learningLimit?: string;     // Daily learning commitment: 'casual' | 'intermediate' | 'expert' | 'professional'
  mainGoal?: string;          // Primary financial goal: 'grow-wealth' | 'passive-income' | 'financial-independence' | 'retire-wealthy' | 'learn-skills' | 'travel-world'
  referralSource?: string;    // How they heard about the app: 'facebook' | 'google' | 'friends' | 'linkedin' | 'playstore-appstore' | 'others'
  avatar?: string;            // Selected avatar ID: 'avatar1' | 'avatar2' | ... | 'avatar10'
}
```

### Learning Limit Values and Meanings
- `casual`: 5 minutes per day
- `intermediate`: 10 minutes per day  
- `expert`: 15 minutes per day
- `professional`: 20 minutes per day

### Goal Options
- `grow-wealth`: Grow wealth
- `passive-income`: Build passive income
- `financial-independence`: Financial independence
- `retire-wealthy`: Retire Wealthy
- `learn-skills`: Learn useful skills
- `travel-world`: Travel the world

### Referral Source Options
- `facebook`: Facebook
- `google`: Google
- `friends`: Friends
- `linkedin`: LinkedIn
- `playstore-appstore`: Playstore / Appstore
- `others`: Others

### Avatar Options
- `avatar1` through `avatar10`: Different avatar characters (currently using emoji placeholders)

## Required Backend Service Updates

### 1. Update AuthService.createAccount()
Add username parameter and ensure it's stored in the user document:

```typescript
async createAccount(
  email: string, 
  password: string, 
  name: string, 
  phoneNumber?: string,
  username?: string
) {
  // Your existing account creation logic
  // Make sure to include username in the user document creation
}
```

### 2. Add AuthService.updateUserOnboarding()
Create a new method to update user onboarding data:

```typescript
async updateUserOnboarding(
  userId: string, 
  onboardingData: {
    age: number;
    learningLimit: string;
    mainGoal: string;
    referralSource: string;
    avatar: string;
  }
) {
  // Update the user document with onboarding data
  // This should update the existing user record with the new fields
}
```

## Database Migration Notes

### For Appwrite:
1. Update your user collection schema to include the new optional fields
2. Ensure username has a unique index if you want to enforce uniqueness
3. The existing users will have null/undefined values for these fields until they complete onboarding

### Field Validation:
- `age`: Number between 7 and 100
- `learningLimit`: Must be one of the valid options
- `mainGoal`: Must be one of the valid goal options  
- `referralSource`: Must be one of the valid referral options
- `avatar`: Must be one of the valid avatar IDs
- `username`: Should be unique and follow your username rules (e.g., alphanumeric, length limits)

## Profile Display
The avatar and other onboarding data should be displayed in:
1. User's profile page
2. Main tab navigator (avatar)
3. Leaderboard (avatar and username)
4. Any other UI elements that show user identity

## Notes
- All onboarding fields are optional to maintain backward compatibility
- Users can update these preferences later in their profile settings
- The avatar field stores the avatar ID, you'll need to map this to the actual avatar image/emoji in your UI
- Consider adding validation on the backend to ensure data integrity