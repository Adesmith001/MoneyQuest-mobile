export type LearningReminderDefinition = {
  hour: number;
  minute: number;
  category: NotificationTemplateCategory;
};

export type DailyReminderTrigger = {
  type: 'daily';
  hour: number;
  minute: number;
};

export type NotificationTemplateCategory =
  | 'morning_motivation'
  | 'afternoon_nudge'
  | 'evening_reflection'
  | 'streak_protection'
  | 'leaderboard_nudge'
  | 'inactivity_recovery'
  | 'day_end_prompt'
  | 'trial_countdown';

export type NotificationTriggerType =
  | 'learning-reminder'
  | 'engagement'
  | 'day-end-inactive'
  | 'trial-countdown';

export interface NotificationSelectionContext {
  hasOpenedToday?: boolean;
  currentStreak?: number;
  monthlyXP?: number;
  hoursSinceLastOpen?: number;
}

export interface NotificationTemplate {
  id: string;
  category: NotificationTemplateCategory;
  title: string;
  body: string;
}

export interface TrialReminderMessage {
  title: string;
  body: string;
}

export interface SelectedNotificationTemplate extends NotificationTemplate {
  analytics: {
    templateId: string;
    templateCategory: NotificationTemplateCategory;
    scheduledHour?: number;
    triggerType: NotificationTriggerType;
  };
}

const MORNING_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'morning-motivation-1',
    category: 'morning_motivation',
    title: 'Build wealth today',
    body: 'Your future self is smiling already. Keep building wealth, one step at a time.',
  },
  {
    id: 'morning-motivation-2',
    category: 'morning_motivation',
    title: 'Small wins count',
    body: 'Small wins count! You’re making progress toward financial freedom today.',
  },
  {
    id: 'morning-motivation-3',
    category: 'morning_motivation',
    title: 'Future billionaire loading',
    body: 'Future billionaire loading… one lesson at a time.',
  },
  {
    id: 'morning-motivation-4',
    category: 'morning_motivation',
    title: 'Your next money move',
    body: 'Big opportunities start with small lessons. Ready?',
  },
];

const AFTERNOON_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'afternoon-nudge-1',
    category: 'afternoon_nudge',
    title: 'Three minutes now',
    body: 'Take 3 minutes for your future. That’s all today’s lesson needs.',
  },
  {
    id: 'afternoon-nudge-2',
    category: 'afternoon_nudge',
    title: 'No pressure',
    body: 'No pressure. Just one lesson today can move you forward.',
  },
  {
    id: 'afternoon-nudge-3',
    category: 'afternoon_nudge',
    title: 'Use the break well',
    body: 'Before you buy another data bundle, have you invested in your knowledge today?',
  },
  {
    id: 'afternoon-nudge-4',
    category: 'afternoon_nudge',
    title: 'Omo, keep going',
    body: 'Omo, see growth! Another lesson completed. Keep going.',
  },
];

const EVENING_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'evening-reflection-1',
    category: 'evening_reflection',
    title: 'End the day stronger',
    body: 'Wealth isn’t built overnight. Consistency wins.',
  },
  {
    id: 'evening-reflection-2',
    category: 'evening_reflection',
    title: 'One smart decision',
    body: 'One smart decision today can compound for years.',
  },
  {
    id: 'evening-reflection-3',
    category: 'evening_reflection',
    title: 'Your future can’t wait',
    body: 'That shawarma can wait. Your future can’t.',
  },
  {
    id: 'evening-reflection-4',
    category: 'evening_reflection',
    title: 'Future self',
    body: 'Your future self will thank you for showing up today.',
  },
];

const STREAK_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'streak-protection-1',
    category: 'streak_protection',
    title: 'Your streak is in danger',
    body: 'Your streak is about to die. Finish one lesson today to protect your progress.',
  },
  {
    id: 'streak-protection-2',
    category: 'streak_protection',
    title: 'Do not lose this run',
    body: 'You are one missed day away from losing your streak. Open the app and save it now.',
  },
  {
    id: 'streak-protection-3',
    category: 'streak_protection',
    title: 'Protect the progress',
    body: 'Don’t let today erase what you already built. One lesson keeps the streak alive.',
  },
];

const LEADERBOARD_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'leaderboard-nudge-1',
    category: 'leaderboard_nudge',
    title: 'Your rank can move',
    body: 'Your next money breakthrough could be one lesson away.',
  },
  {
    id: 'leaderboard-nudge-2',
    category: 'leaderboard_nudge',
    title: 'Stay ahead',
    body: 'Your mates are scrolling. You’re building wealth.',
  },
  {
    id: 'leaderboard-nudge-3',
    category: 'leaderboard_nudge',
    title: 'Keep climbing',
    body: 'Every lesson completed makes you a smarter investor.',
  },
];

const INACTIVITY_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'inactivity-recovery-1',
    category: 'inactivity_recovery',
    title: 'Start fresh today',
    body: 'Missed a chance to save last week? Start fresh today.',
  },
  {
    id: 'inactivity-recovery-2',
    category: 'inactivity_recovery',
    title: 'Tough days happen',
    body: 'Tough day? Even small progress today is still progress.',
  },
  {
    id: 'inactivity-recovery-3',
    category: 'inactivity_recovery',
    title: 'No need to dwell',
    body: 'Don’t dwell on past money mistakes. Learn from them.',
  },
];

const DAY_END_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'day-end-prompt-1',
    category: 'day_end_prompt',
    title: 'Before today ends',
    body: 'The best time to start was yesterday. The second-best time is now.',
  },
  {
    id: 'day-end-prompt-2',
    category: 'day_end_prompt',
    title: 'One more lesson',
    body: 'Wait… you’re only one lesson away from your next reward.',
  },
  {
    id: 'day-end-prompt-3',
    category: 'day_end_prompt',
    title: 'Make today count',
    body: 'School no dey teach all the money lessons. That’s why we’re here.',
  },
];

const TRIAL_MESSAGES: Record<number, TrialReminderMessage> = {
  14: {
    title: 'Your free trial just started',
    body: 'You have 14 days left in your free trial. Make them count with one lesson today.',
  },
  7: {
    title: '7 days left in your trial',
    body: 'You have 7 days left in your free trial. Keep learning before access ends.',
  },
  3: {
    title: '3 days left in your trial',
    body: 'Only 3 days left in your free trial. Finish the lessons you can while you still have access.',
  },
};

const TEMPLATE_LIBRARY: Record<Exclude<NotificationTemplateCategory, 'trial_countdown'>, NotificationTemplate[]> = {
  morning_motivation: MORNING_TEMPLATES,
  afternoon_nudge: AFTERNOON_TEMPLATES,
  evening_reflection: EVENING_TEMPLATES,
  streak_protection: STREAK_TEMPLATES,
  leaderboard_nudge: LEADERBOARD_TEMPLATES,
  inactivity_recovery: INACTIVITY_TEMPLATES,
  day_end_prompt: DAY_END_TEMPLATES,
};

export const LEARNING_REMINDER_SCHEDULE: LearningReminderDefinition[] = [
  { hour: 10, minute: 0, category: 'morning_motivation' },
  { hour: 14, minute: 0, category: 'afternoon_nudge' },
  { hour: 19, minute: 0, category: 'evening_reflection' },
];

export const getTrialReminderThresholds = (): number[] => [14, 7, 3];

export const getTrialReminderMessage = (daysLeft: number): TrialReminderMessage => {
  return TRIAL_MESSAGES[daysLeft] ?? {
    title: `${daysLeft} days left in your trial`,
    body: `You have ${daysLeft} days left in your free trial. Keep learning while your access is active.`,
  };
};

const getDefaultCategoryForHour = (scheduledHour?: number): NotificationTemplateCategory => {
  if (scheduledHour === 10) {
    return 'morning_motivation';
  }
  if (scheduledHour === 14) {
    return 'afternoon_nudge';
  }
  return 'evening_reflection';
};

const chooseCategory = (
  triggerType: NotificationTriggerType,
  scheduledHour?: number,
  context?: NotificationSelectionContext
): NotificationTemplateCategory => {
  const hasOpenedToday = context?.hasOpenedToday ?? true;
  const currentStreak = context?.currentStreak ?? 0;
  const monthlyXP = context?.monthlyXP ?? 0;

  if (!hasOpenedToday && currentStreak > 0) {
    return 'streak_protection';
  }

  if (triggerType === 'engagement' && monthlyXP > 0) {
    return 'leaderboard_nudge';
  }

  if (triggerType === 'engagement') {
    return 'inactivity_recovery';
  }

  if (triggerType === 'day-end-inactive') {
    return 'day_end_prompt';
  }

  if (!hasOpenedToday && monthlyXP > 0) {
    return 'leaderboard_nudge';
  }

  return getDefaultCategoryForHour(scheduledHour);
};

const formatTemplateBody = (
  template: NotificationTemplate,
  context?: NotificationSelectionContext
): string => {
  if (template.category !== 'streak_protection') {
    return template.body;
  }

  const currentStreak = Math.max(0, Number(context?.currentStreak ?? 0));
  if (currentStreak <= 0) {
    return template.body;
  }

  if (currentStreak >= 7) {
    return `Your streak is about to die. Don't lose ${currentStreak} days of progress. Finish one lesson today.`;
  }

  return `Your streak is about to break. Don't lose ${currentStreak} days of progress. Finish one lesson today.`;
};

export const chooseNotificationTemplate = ({
  triggerType,
  scheduledHour,
  context,
  lastTemplateIdByCategory = {},
}: {
  triggerType: NotificationTriggerType;
  scheduledHour?: number;
  context?: NotificationSelectionContext;
  lastTemplateIdByCategory?: Partial<Record<NotificationTemplateCategory, string>>;
}): SelectedNotificationTemplate => {
  const category = chooseCategory(triggerType, scheduledHour, context);
  const templates = TEMPLATE_LIBRARY[category as Exclude<NotificationTemplateCategory, 'trial_countdown'>];
  const lastTemplateId = lastTemplateIdByCategory[category];
  const lastTemplateIndex = templates.findIndex((template) => template.id === lastTemplateId);
  const nextTemplateIndex =
    lastTemplateIndex >= 0 ? (lastTemplateIndex + 1) % templates.length : 0;
  const preferredTemplate = templates[nextTemplateIndex] || templates[0];

  return {
    ...preferredTemplate,
    body: formatTemplateBody(preferredTemplate, context),
    analytics: {
      templateId: preferredTemplate.id,
      templateCategory: preferredTemplate.category,
      scheduledHour,
      triggerType,
    },
  };
};

export const buildDailyReminderTrigger = ({
  hour,
  minute,
}: Pick<LearningReminderDefinition, 'hour' | 'minute'>): DailyReminderTrigger => ({
  type: 'daily',
  hour,
  minute,
});
