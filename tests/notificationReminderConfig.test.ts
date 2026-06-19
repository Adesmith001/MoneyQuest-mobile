import {
  LEARNING_REMINDER_SCHEDULE,
  buildDailyReminderTrigger,
  chooseNotificationTemplate,
  getTrialReminderThresholds,
  getTrialReminderMessage,
} from '../src/utils/notificationReminderConfig';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(LEARNING_REMINDER_SCHEDULE.length === 3, 'defines exactly three repeating reminders');

assert(
  LEARNING_REMINDER_SCHEDULE.map((reminder) => reminder.hour).join(',') === '10,14,19',
  'keeps the configured reminder hours'
);

assert(
  LEARNING_REMINDER_SCHEDULE.map((reminder) => reminder.category).join(',') ===
    'morning_motivation,afternoon_nudge,evening_reflection',
  'maps reminder slots to stable default categories'
);

const triggers = LEARNING_REMINDER_SCHEDULE.map((reminder) => buildDailyReminderTrigger(reminder));

triggers.forEach((trigger, index) => {
  assert(trigger.type === 'daily', `reminder ${index + 1} uses a daily repeating trigger`);
});

assert(
  JSON.stringify(triggers) === JSON.stringify([
    { type: 'daily', hour: 10, minute: 0 },
    { type: 'daily', hour: 14, minute: 0 },
    { type: 'daily', hour: 19, minute: 0 },
  ]),
  'builds stable repeating trigger definitions for all reminder times'
);

const morningTemplate = chooseNotificationTemplate({
  triggerType: 'learning-reminder',
  scheduledHour: 10,
});

assert(
  morningTemplate.category === 'morning_motivation' && morningTemplate.analytics.triggerType === 'learning-reminder',
  'returns morning motivation content with analytics metadata'
);

const nonRepeatingEveningTemplate = chooseNotificationTemplate({
  triggerType: 'learning-reminder',
  scheduledHour: 19,
  lastTemplateIdByCategory: {
    evening_reflection: 'evening-reflection-1',
  },
});

assert(
  nonRepeatingEveningTemplate.category === 'evening_reflection' &&
    nonRepeatingEveningTemplate.id !== 'evening-reflection-1',
  'avoids repeating the last template in a category when alternatives exist'
);

const streakTemplate = chooseNotificationTemplate({
  triggerType: 'learning-reminder',
  scheduledHour: 19,
  context: {
    hasOpenedToday: false,
    currentStreak: 4,
    monthlyXP: 150,
  },
});

assert(
  streakTemplate.category === 'streak_protection',
  'prefers streak protection messaging for active users who have not opened today'
);

const leaderboardTemplate = chooseNotificationTemplate({
  triggerType: 'engagement',
  context: {
    hasOpenedToday: true,
    currentStreak: 0,
    monthlyXP: 80,
  },
});

assert(
  leaderboardTemplate.category === 'leaderboard_nudge',
  'uses leaderboard nudges for engagement reminders when monthly progress exists'
);

assert(
  JSON.stringify(getTrialReminderThresholds()) === JSON.stringify([14, 7, 3]),
  'defines only the valid free-trial countdown thresholds for a 14-day trial'
);

const trialReminder = getTrialReminderMessage(7);

assert(
  trialReminder.title.length > 0 && trialReminder.body.includes('7'),
  'builds trial reminder copy that reflects the exact days left threshold'
);

const urgentStreakTemplate = chooseNotificationTemplate({
  triggerType: 'day-end-inactive',
  context: {
    hasOpenedToday: false,
    currentStreak: 7,
    monthlyXP: 120,
  },
});

assert(
  urgentStreakTemplate.category === 'streak_protection' &&
    urgentStreakTemplate.body.includes('7'),
  'uses streak-protection copy with the user streak count when urgency is needed'
);
