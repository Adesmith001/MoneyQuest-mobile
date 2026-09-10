import type { AppTourMode } from '../utils/tutorialBehavior';

export interface AppTourSlide {
  icon: string;
  title: string;
  description: string;
  mascotMessage: string;
  backgroundColor: string;
  accentColor: string;
}

const FEATURE_TOUR_SLIDES: AppTourSlide[] = [
  {
    icon: '\u2694\uFE0F',
    title: 'Take on Quests',
    description:
      'Visit the Quests tab to complete daily and weekly challenges. Every quest tracks your progress and can reward you with extra XP.',
    mascotMessage: 'New challenges are waiting for you!',
    backgroundColor: '#FFF3E0',
    accentColor: '#FF6B35',
  },
  {
    icon: '\u{1F381}',
    title: 'Unlock Reward Chests',
    description:
      'Complete the required challenges to unlock Chests, then claim them from the Quests tab to collect their rewards.',
    mascotMessage: 'Finish challenges, open Chests, earn rewards.',
    backgroundColor: '#FFF8E1',
    accentColor: '#FF9800',
  },
  {
    icon: '\u{1F3C5}',
    title: 'Collect Badges',
    description:
      'Earn Badges as you reach learning milestones. Open your Profile to view your collection and see progress toward the next achievement.',
    mascotMessage: 'Every Badge tells the story of your progress.',
    backgroundColor: '#E8EDF5',
    accentColor: '#3B5998',
  },
];

const CORE_TOUR_SLIDES: AppTourSlide[] = [
  {
    icon: '\u{1F5FA}\uFE0F',
    title: 'Your Learning Path',
    description:
      'Each section covers a financial topic. Finish the current glowing star before the next level unlocks, swipe to explore sections, and refresh when new content is available.',
    mascotMessage: 'Let me show you around! This is where all the learning happens.',
    backgroundColor: '#D4E8F5',
    accentColor: '#FF5722',
  },
  {
    icon: '\u2B50',
    title: 'Earn XP & Climb',
    description:
      "Answer questions correctly to earn XP. The leaderboard ranks learners by monthly XP and shows each learner's current streak.",
    mascotMessage: 'Points make it fun! Try to get as many right as you can.',
    backgroundColor: '#FFF8E1',
    accentColor: '#FF9800',
  },
  {
    icon: '\u2764\uFE0F',
    title: 'Lives System',
    description:
      'You start with 5 lives. Each wrong answer costs 1 life. Complete levels to earn lives back, up to 5 max.',
    mascotMessage: "Don't worry if you make mistakes - we all learn from them!",
    backgroundColor: '#FCE4EC',
    accentColor: '#F44336',
  },
  {
    icon: '\u{1F4AC}',
    title: 'Feedback & Flags',
    description:
      'After each answer, the app explains whether you were correct. If a question looks wrong or confusing, use the flag button.',
    mascotMessage: 'Good feedback helps you learn faster.',
    backgroundColor: '#FFF3E0',
    accentColor: '#FF6B35',
  },
  {
    icon: '\u{1F525}',
    title: 'Daily Streaks',
    description:
      'Complete a lesson each day to build your streak. The Streak tab shows your current streak and active days this week.',
    mascotMessage: 'Can you keep your streak going? I believe in you!',
    backgroundColor: '#FFF3E0',
    accentColor: '#FF6B35',
  },
  {
    icon: '\u{1F3AF}',
    title: "You're All Set!",
    description:
      'Start your first lesson now! You can always replay this guide from Profile > How to Play.',
    mascotMessage: "Go ahead and tap that first level - you've got this! \u{1F98A}",
    backgroundColor: '#E8F5E9',
    accentColor: '#4CAF50',
  },
];

export const getAppTourSlides = (mode: AppTourMode): AppTourSlide[] =>
  mode === 'update'
    ? FEATURE_TOUR_SLIDES
    : [
        ...CORE_TOUR_SLIDES.slice(0, 2),
        ...FEATURE_TOUR_SLIDES,
        ...CORE_TOUR_SLIDES.slice(2),
      ];
