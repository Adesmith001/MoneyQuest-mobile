"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notificationReminderConfig_1 = require("../src/utils/notificationReminderConfig");
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
assert(notificationReminderConfig_1.LEARNING_REMINDER_SCHEDULE.length === 3, 'defines exactly three repeating reminders');
assert(notificationReminderConfig_1.LEARNING_REMINDER_SCHEDULE.map((reminder) => reminder.hour).join(',') === '10,14,19', 'keeps the configured reminder hours');
const triggers = notificationReminderConfig_1.LEARNING_REMINDER_SCHEDULE.map((reminder) => (0, notificationReminderConfig_1.buildDailyReminderTrigger)(reminder));
triggers.forEach((trigger, index) => {
    assert(trigger.type === 'daily', `reminder ${index + 1} uses a daily repeating trigger`);
});
assert(JSON.stringify(triggers) === JSON.stringify([
    { type: 'daily', hour: 10, minute: 0 },
    { type: 'daily', hour: 14, minute: 0 },
    { type: 'daily', hour: 19, minute: 0 },
]), 'builds stable repeating trigger definitions for all reminder times');
