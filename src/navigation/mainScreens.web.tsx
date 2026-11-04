import React from 'react';

export const MainTabNavigator = React.lazy(() => import('./MainTabNavigator'));
export const PremiumScreen = React.lazy(() => import('../screens/common/PremiumScreen'));
export const SchoolCodeEntryScreen = React.lazy(() => import('../screens/common/SchoolCodeEntryScreen'));
export const QuestionScreen = React.lazy(() => import('../screens/game/QuestionScreen'));
export const CelebrationFlow = React.lazy(() => import('../components/gamification/CelebrationFlow'));
export const DailyQuestScreen = React.lazy(() => import('../screens/game/DailyQuestScreen'));
export const AchievementUnlockScreen = React.lazy(() => import('../screens/game/AchievementUnlockScreen'));
export const BadgeCatalogueScreen = React.lazy(() => import('../screens/game/BadgeCatalogueScreen'));
export const EditProfileScreen = React.lazy(() => import('../screens/profile/EditProfileScreen'));
export const ChangeAvatarScreen = React.lazy(() => import('../screens/profile/ChangeAvatarScreen'));
