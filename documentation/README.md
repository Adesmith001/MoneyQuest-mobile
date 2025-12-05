# MoneyQuest Frontend Documentation

Welcome to the MoneyQuest frontend documentation! This guide will help you understand the architecture, structure, and implementation details of the MoneyQuest mobile application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Overview](#project-overview)
3. [Architecture](#architecture)
4. [Documentation Files](#documentation-files)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm package manager
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

### Installation

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=your_appwrite_endpoint
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_USERS_COLLECTION_ID=users_collection_id
APPWRITE_QUESTIONS_COLLECTION_ID=questions_collection_id
APPWRITE_LEADERBOARD_COLLECTION_ID=leaderboard_collection_id
APPWRITE_LEVELS_COLLECTION_ID=levels_collection_id
APPWRITE_USER_PROGRESS_COLLECTION_ID=progress_collection_id
APPWRITE_STREAKS_COLLECTION_ID=streaks_collection_id
APPWRITE_STORAGE_BUCKET_ID=storage_bucket_id

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
FACEBOOK_APP_ID=your_facebook_app_id
TWITTER_CLIENT_ID=your_twitter_client_id

# OpenAI API
OPENAI_API_KEY=your_openai_api_key
```

## Project Overview

MoneyQuest is a gamified financial literacy mobile application built with:

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **React Navigation** - Navigation
- **Appwrite** - Backend as a Service (BaaS)
- **Custom Python Backend** - Question generation and content management

### Key Features

1. **Progressive Learning Path** - Users progress through sections and levels sequentially
2. **Multiple Question Types** - MCQ, Scenario-based, Matching, Fill-in-the-Gap
3. **Lives System** - 5 lives that regenerate over time
4. **Streak Tracking** - Daily streak system to encourage consistent learning
5. **XP & Leveling** - Gamification through experience points
6. **Audio Support** - Text-to-speech for questions
7. **Avatar Customization** - Personalized user experience
8. **Onboarding Flow** - Multi-step user setup process

## Architecture

MoneyQuest follows a modular architecture with clear separation of concerns:

```
Frontend (React Native + Expo)
├── Navigation Layer
├── Screens Layer
├── Component Layer
├── State Management (Redux)
├── Services Layer (API Communication)
└── Types & Constants

Backend (Python FastAPI)
├── Question Generation (OpenAI)
├── Document Management (Qdrant)
├── Audio Services (TTS/Transcription)
└── Learning Progress Tracking
```

## Documentation Files

This documentation is organized into several focused guides:

### 1. [Project Structure](./01-project-structure.md)
Detailed breakdown of the folder structure and file organization.

### 2. [Navigation Flow](./02-navigation-flow.md)
Understanding the navigation architecture and screen flows.

### 3. [State Management](./03-state-management.md)
Redux store configuration, slices, and state management patterns.

### 4. [Services & API](./04-services-api.md)
Backend communication, Appwrite integration, and API services.

### 5. [Component Guide](./05-component-guide.md)
Reusable components, their props, and usage examples.

### 6. [Question System](./06-question-system.md)
Question types, generation, rendering, and answer validation.

### 7. [User Progress & Lives](./07-progress-lives.md)
Progress tracking, level unlocking, and lives system implementation.

### 8. [Styling & Theming](./08-styling-theming.md)
Styling conventions, responsive design, and theme management.

### 9. [Common Workflows](./09-common-workflows.md)
Step-by-step guides for common development tasks.

### 10. [Troubleshooting](./10-troubleshooting.md)
Common issues and their solutions.

## Quick Reference

### Important Files

- `App.tsx` - Application entry point
- `src/navigation/AppNavigator.tsx` - Main navigation configuration
- `src/store/index.ts` - Redux store setup
- `src/services/auth.ts` - Authentication service
- `src/services/questions.ts` - Question fetching and management
- `src/config/appwrite.ts` - Backend configuration

### Key Concepts

1. **User Flow**: Onboarding → Authentication → Main App → Question Screen → Level Completion
2. **Progress System**: Progressive unlocking - complete current level to unlock next
3. **Lives System**: Start with 5 lives, lose 1 per wrong answer, regenerate 1 per hour
4. **XP System**: Earn XP for correct answers, level up based on total XP

## Getting Help

- Check the specific documentation files for detailed information
- Review the troubleshooting guide for common issues
- Examine existing code examples in similar components/screens

## Contributing

When adding new features:

1. Follow the existing folder structure
2. Use TypeScript for type safety
3. Create reusable components
4. Update documentation accordingly
5. Test on both iOS and Android

---

**Last Updated**: December 2025
**Version**: 1.0.0
