import { CoachMarkStep } from '../components/tutorial/CoachMark';

export const HOME_COACH_STEPS: CoachMarkStep[] = [
  {
    icon: 'book-outline',
    title: 'Welcome to Your Learning Path!',
    description:
      'This is your learning path. Each section covers a different financial topic with multiple levels to complete.',
    mascotMessage: 'This is where all the learning happens. Let me explain.',
    tooltipPosition: 'center',
  },
  {
    icon: 'star',
    title: 'Start a Level',
    description:
      'Tap the glowing orange star to start your current level. You must complete one level before the next one in that section unlocks. Checkmarks show completed levels, and locks mean you still need the earlier level first.',
    mascotMessage: "See that bright star? That's your next lesson.",
    tooltipPosition: 'center',
  },
  {
    icon: 'swap-horizontal',
    title: 'Swipe to Explore',
    description:
      'Swipe left and right to browse through sections. After this guide finishes, the app will help you practice both directions.',
    mascotMessage: 'You will practice swiping as soon as this guide ends.',
    tooltipPosition: 'center',
  },
  {
    icon: 'refresh',
    title: 'Refresh Content',
    description:
      'Tap the orange refresh button when new content is available or when you want to reload the learning path.',
    mascotMessage: 'Use refresh when you want the newest lessons.',
    tooltipPosition: 'center',
  },
];

export const QUESTION_COACH_STEPS: CoachMarkStep[] = [
  {
    icon: 'create-outline',
    title: 'Read & Learn First',
    description:
      "Each level starts with an article about the topic. Read it carefully, then tap 'Start Quiz' when you're ready.",
    mascotMessage: 'Knowledge first, then the quiz.',
    tooltipPosition: 'center',
  },
  {
    icon: 'radio-button-on',
    title: 'Answer Questions',
    description:
      "Select the answer you think is correct, then tap 'Next' to submit. You'll get instant feedback with explanations.",
    mascotMessage: "Take your time. There's no rush.",
    tooltipPosition: 'center',
  },
  {
    icon: 'heart',
    title: 'Watch Your Lives',
    description:
      'Each wrong answer costs 1 life. Complete levels to earn lives back, up to 5 max.',
    mascotMessage: 'Protect your hearts by learning carefully.',
    tooltipPosition: 'top',
  },
  {
    icon: 'flag',
    title: 'Flag Questions',
    description:
      'Use the flag button when a question is confusing or looks incorrect. Flagged questions are removed from your current quiz.',
    mascotMessage: 'Spot a bad question? Flag it for review.',
    tooltipPosition: 'center',
  },
];

export const LEADERBOARD_COACH_STEPS: CoachMarkStep[] = [
  {
    icon: 'trophy-outline',
    title: 'Leaderboard',
    description:
      "The leaderboard ranks learners by monthly XP and shows each learner's current streak beside their score.",
    mascotMessage: 'Climb by learning consistently and answering correctly.',
    tooltipPosition: 'center',
  },
];

export const STREAK_COACH_STEPS: CoachMarkStep[] = [
  {
    icon: 'flame-outline',
    title: 'Your Daily Streak',
    description:
      'Complete a lesson every day to build your streak. Each active day is highlighted here.',
    mascotMessage: 'Consistency is key to becoming a money master.',
    tooltipPosition: 'center',
  },
  {
    icon: 'calendar-outline',
    title: 'Weekly Progress',
    description:
      'The circles show each day of the week. Filled circles mean you were active that day. Try to fill them all.',
    mascotMessage: 'Can you get a perfect week?',
    tooltipPosition: 'center',
  },
];

export const PROFILE_COACH_STEPS: CoachMarkStep[] = [
  {
    icon: 'person-outline',
    title: 'Your Profile',
    description:
      'This is your profile. See your streak count, monthly XP, lives remaining, and achievements all in one place.',
    mascotMessage: "Here's everything about you.",
    tooltipPosition: 'center',
  },
  {
    icon: 'help-circle-outline',
    title: 'Find Tutorials Again',
    description:
      'Use the How to Play button on this screen whenever you want to replay tutorials. Open it once to complete this step.',
    mascotMessage: 'Open How to Play once so you know exactly where tutorials live.',
    tooltipPosition: 'center',
    requiredActionKey: 'profile_tutorial_hub_opened',
    blockedMessage: 'Open How to Play from your profile to continue.',
  },
  {
    icon: 'pencil',
    title: 'Customize Your Profile',
    description:
      'Tap the edit icon in the header to change your name, avatar, and other settings.',
    mascotMessage: 'Make your profile yours.',
    tooltipPosition: 'center',
  },
];
