"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDailyReminderTrigger = exports.LEARNING_REMINDER_SCHEDULE = void 0;
exports.LEARNING_REMINDER_SCHEDULE = [
    {
        hour: 10,
        minute: 0,
        title: 'Morning Learning!',
        body: 'Start your day with a financial lesson!',
    },
    {
        hour: 14,
        minute: 0,
        title: 'Afternoon Break!',
        body: 'Time for your daily financial literacy lesson!',
    },
    {
        hour: 19,
        minute: 0,
        title: 'Evening Learning!',
        body: "Complete today's lesson before bed!",
    },
];
const buildDailyReminderTrigger = ({ hour, minute, }) => ({
    type: 'daily',
    hour,
    minute,
});
exports.buildDailyReminderTrigger = buildDailyReminderTrigger;
