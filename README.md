# MoneyQuest - Financial Education App

A React Native mobile application that gamifies financial education with a Duolingo-style interface. Users learn financial concepts through interactive questions, earn XP, maintain daily streaks, and compete on monthly leaderboards.

## 🚀 Features

### Core Features
- **Interactive Learning**: Duolingo-style lessons with multiple choice questions
- **Gamification**: XP system, daily streaks, and level progression
- **Audio Support**: Text-to-speech for questions and content
- **Social Authentication**: Login with Google, Facebook, and Twitter
- **Profile Customization**: Choose from multiple avatar options
- **Leaderboards**: Monthly rankings that reset to give everyone a chance
- **Push Notifications**: Daily reminders and streak alerts
- **Progress Tracking**: Track learning progress across levels and sections

### Technical Features
- **React Native + Expo**: Cross-platform mobile development
- **Appwrite Backend**: User management, database, storage, and authentication
- **Redux Toolkit**: State management with persistence
- **TypeScript**: Type-safe development
- **Responsive Design**: Optimized for different screen sizes

## 📱 Screenshots

The app features a beautiful orange-themed design inspired by financial growth and energy:

- **Welcome Screen**: Orange splash screen with Money Quest branding
- **Learning Path**: Visual level progression with locked/unlocked states
- **Question Interface**: Clean, focused question screens with audio support
- **Leaderboard**: Competitive rankings with user avatars
- **Profile**: Personal stats, streaks, and achievement tracking

## 🏗️ Architecture

### Frontend Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
│   ├── auth/           # Authentication screens
│   ├── main/           # Main app screens (Home, Leaderboard, Profile)
│   ├── game/           # Game/question screens
│   └── profile/        # Profile and settings screens
├── navigation/         # React Navigation setup
├── services/           # API and service integrations
│   ├── appwrite.ts     # Appwrite configuration
│   ├── auth.ts         # Authentication service
│   ├── questions.ts    # Question management
│   └── notifications.ts # Push notification service
├── store/              # Redux store and slices
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── constants/          # App constants and theme
```

### Backend (Appwrite)

#### Database Collections
1. **Users**: User profiles, XP, streaks, progress
2. **Questions**: Question bank with levels, sections, and difficulty
3. **Leaderboard**: Monthly rankings and scores
4. **Levels**: Level configuration and unlock requirements
5. **User Progress**: Individual progress tracking per level/section

#### Storage
- **Profile Pictures**: User avatar uploads

#### Authentication
- Email/Password authentication
- OAuth providers: Google, Facebook, Twitter
- Password recovery with OTP verification

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- Appwrite account (cloud.appwrite.io or self-hosted)
- Mobile device with Expo Go app OR Android/iOS emulator

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd MoneyQuest
npm install
```

### 2. Appwrite Backend Setup

1. **Create Appwrite Project**
   - Go to [Appwrite Cloud](https://cloud.appwrite.io)
   - Create new project "MoneyQuest"
   - Copy Project ID

2. **Database Setup**
   - Create database "MoneyQuest"
   - Create collections according to `APPWRITE_SETUP.md`
   - Set up proper permissions for each collection

3. **Authentication Setup**
   - Enable Email/Password authentication
   - Configure OAuth providers (Google, Facebook, Twitter)
   - Set up proper redirect URLs

4. **Storage Setup**
   - Create bucket "profile_pictures"
   - Configure file permissions and size limits

### 3. Environment Configuration

Create `.env` file in the root directory:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_QUESTIONS_COLLECTION_ID=questions
APPWRITE_LEADERBOARD_COLLECTION_ID=leaderboard
APPWRITE_LEVELS_COLLECTION_ID=levels
APPWRITE_USER_PROGRESS_COLLECTION_ID=user_progress
APPWRITE_STORAGE_BUCKET_ID=profile_pictures

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
FACEBOOK_APP_ID=your_facebook_app_id
TWITTER_CLIENT_ID=your_twitter_client_id

# AI Service (Optional)
AI_API_KEY=your_ai_api_key
AI_API_ENDPOINT=https://api.openai.com/v1
```

### 4. Run the Application

```bash
# Start the development server
npm start

# Options:
npm run android    # Open on Android device/emulator
npm run ios        # Open on iOS device/simulator
npm run web        # Open in web browser
```

## 🎮 How to Use

### For Users
1. **Sign Up**: Create account or use social login
2. **Profile Setup**: Choose your avatar and set learning goals
3. **Start Learning**: Begin with Level 1 financial basics
4. **Answer Questions**: Listen to questions and select answers
5. **Track Progress**: Monitor XP, streaks, and leaderboard position
6. **Stay Consistent**: Maintain daily login streaks for bonuses

### For Developers
1. **Add Questions**: Use the question service to add new content
2. **Customize Levels**: Modify `LEVEL_THEMES` in constants
3. **Update UI**: Customize colors and styling in constants
4. **Add Features**: Extend with new screens and functionality

## 🔧 Development

### Key Technologies
- **React Native 0.81.4**
- **Expo SDK 54**
- **TypeScript 5.9**
- **Redux Toolkit** (for state management)
- **Appwrite** (Backend-as-a-Service)
- **React Navigation 6** (Navigation)

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Redux Toolkit for state management
- Modular architecture with services
- Responsive design principles

### Testing
```bash
# Run tests (when implemented)
npm test

# Type checking
npx tsc --noEmit

# Linting
npx eslint src/
```

## 📊 Learning Content

### Level Structure
1. **Level 1**: Financial Basics
   - What is Money?
   - Saving vs Spending
   - Banking Basics
   - Budgeting 101

2. **Level 2**: Smart Spending
   - Needs vs Wants
   - Comparison Shopping
   - Avoiding Debt
   - Credit Basics

3. **Level 3**: Investment Fundamentals
   - What is Investing?
   - Risk and Return
   - Stock Market Basics
   - Diversification

4. **Level 4**: Advanced Planning
   - Emergency Funds
   - Retirement Planning
   - Insurance Basics
   - Tax Fundamentals

### Question Types
- Multiple choice questions
- Audio-enabled questions
- Difficulty levels: Easy, Medium, Hard
- XP rewards based on difficulty
- AI-generated questions (future feature)

## 🔮 Future Enhancements

### Planned Features
- **AI Question Generation**: Dynamic question creation using AI
- **Social Features**: Friend connections and challenges
- **Advanced Analytics**: Detailed learning insights
- **Offline Mode**: Download content for offline learning
- **Achievements System**: Badges and milestone rewards
- **Multi-language Support**: Localization for global users
- **Parent Dashboard**: Progress tracking for younger users

### Technical Improvements
- **Performance Optimization**: Code splitting and lazy loading
- **Advanced Animations**: Smooth transitions and micro-interactions
- **Voice Recognition**: Answer questions by speaking
- **Accessibility**: Screen reader support and accessibility features
- **Testing Suite**: Comprehensive unit and integration tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Appwrite Documentation](https://appwrite.io/docs)
- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org)

## 🆘 Support

For questions and support:
1. Check the documentation
2. Review the `APPWRITE_SETUP.md` file
3. Check existing issues
4. Create a new issue with detailed information

---

**MoneyQuest** - Making financial education engaging and accessible for everyone! 🚀💰