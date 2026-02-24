import { CoachMarkStep } from '../../components/tutorial/CoachMark';

export const HOME_COACH_STEPS: CoachMarkStep[] = [
  {
    icon: '📖',
    title: 'Welcome to Your Learning Path!',
    description:
      'This is your learning path. Each section covers a different financial topic with multiple levels to complete.',
    mascotMessage: "This is where all the magic happens! Let me explain.",
    tooltipPosition: 'center',
  },
  {
    icon: '⭐',
    title: 'Start a Level',
    description:
      'Tap the glowing orange star to start your current level. Stars show unlocked levels, checkmarks show completed ones, and locks mean you need to complete previous levels first.',
    mascotMessage: "See that bright star? That's your next lesson!",
    tooltipPosition: 'center',
  },
  {
    icon: '👆',
    title: 'Swipe to Explore',
    description:
      'Swipe left and right to browse through different sections. Each section has its own topic and set of levels to master.',
    mascotMessage: "There's so much to learn — swipe to see more!",
    tooltipPosition: 'center',
  },
];

export const QUESTION_COACH_STEPS: CoachMarkStep[] = [
  {
    icon: '📝',
    title: 'Read & Learn First',
    description:
      "Each level starts with an article about the topic. Read it carefully, then tap 'Start Quiz' when you're ready!",
    mascotMessage: "Knowledge is power! Read the article first.",
    tooltipPosition: 'center',
  },
  {
    icon: '🎯',
    title: 'Answer Questions',
    description:
      "Select the answer you think is correct, then tap 'Next' to submit. You'll get instant feedback with explanations!",
    mascotMessage: "Take your time — there's no rush!",
    tooltipPosition: 'center',
  },
  {
    icon: '❤️',
    title: 'Watch Your Lives',
    description:
      'See the hearts at the top? Each wrong answer costs 1 life. You have 5 lives max, and they regenerate 1 per hour.',
    mascotMessage: "Be careful with those hearts!",
    tooltipPosition: 'top',
  },
];

export const STREAK_COACH_STEPS: CoachMarkStep[] = [
  {
    icon: '🔥',
    title: 'Your Daily Streak',
    description:
      'Open the app and complete a lesson every day to build your streak! Each active day is highlighted here.',
    mascotMessage: "Consistency is key to becoming a money master!",
    tooltipPosition: 'center',
  },
  {
    icon: '📅',
    title: 'Weekly Progress',
    description:
      'The circles show each day of the week. Filled circles mean you were active that day. Try to fill them all!',
    mascotMessage: "Can you get a perfect week? I bet you can!",
    tooltipPosition: 'center',
  },
];

export const PROFILE_COACH_STEPS: CoachMarkStep[] = [
  {
    icon: '👤',
    title: 'Your Profile',
    description:
      'This is your profile! See your streak count, monthly XP, lives remaining, and achievements all in one place.',
    mascotMessage: "Looking good! Here's everything about you.",
    tooltipPosition: 'center',
  },
  {
    icon: '✏️',
    title: 'Customize Your Profile',
    description:
      "Tap the edit icon in the header to change your name, avatar, and other settings. Make it yours!",
    mascotMessage: "Express yourself! Change your avatar anytime.",
    tooltipPosition: 'center',
  },
];
