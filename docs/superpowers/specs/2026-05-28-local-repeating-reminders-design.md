# Local Repeating Reminder Design

## Goal

Ensure MoneyQuest continues sending baseline engagement reminders even when the user does not open the app for multiple days.

## Current Problem

The current implementation schedules the main learning reminders as one-time notifications using `DATE` triggers. Those reminders are only refreshed when the app opens or returns to the foreground. After the last scheduled notification fires, the user stops receiving reminders until the app is opened again.

## Decision

Replace the main learning reminder flow with true local repeating reminders that fire every day at fixed times, regardless of whether the user opened the app that day.

## Scope

This design changes only the durable baseline reminder system in `src/services/notifications.ts`.

In scope:
- The three fixed learning reminder times
- Duplicate-prevention during setup/resume
- Preserving user preference and OS permission checks

Out of scope:
- Remote push notifications
- Backend-driven campaigns
- Rewriting admin broadcast delivery
- Rewriting lives-restored or other event-based one-off notifications unless needed to avoid conflicts

## Proposed Behavior

The app should maintain three repeating local reminders:
- 10:00 AM
- 2:00 PM
- 7:00 PM

These reminders should:
- Repeat every day indefinitely on-device
- Continue firing even if the app is not opened for several days
- Respect the in-app notification toggle
- Respect OS notification permission state
- Be re-created cleanly when notification setup runs so duplicate reminders do not accumulate

## Technical Design

### Reminder Scheduling

Update `scheduleDailyReminder()` so each reminder uses a repeating calendar trigger rather than a one-time `DATE` trigger.

Expected implementation shape:
- Cancel existing notifications with `data.type === 'learning-reminder'`
- Schedule three reminders with the same metadata currently used for title/body/channel
- Use repeating calendar-style triggers keyed by hour and minute
- Keep the reminder data payload stable so existing filtering and cancellation logic still works

### App Lifecycle

Keep the existing setup flow in place:
- `setupAllNotifications()` still initializes the service, checks user preference, requests permission, and schedules configured notifications
- App foreground transitions may still call `scheduleConfiguredNotifications()`

Because the reminders will now repeat, re-running setup is primarily for:
- Recovering after permission changes
- Re-applying reminders after user re-enables notifications
- Ensuring duplicates are removed before registration

### One-Off Notifications

Keep one-off scheduling behavior unchanged for now:
- `lives-full`
- `engagement`
- `day-end-inactive`
- `admin-broadcast`

This keeps the change focused on the root cause: the baseline reminders are finite today.

## Risks and Constraints

- Local repeating reminders are still subject to device-level notification settings and OEM battery policies.
- Repeating reminders solve schedule exhaustion, but they do not provide the reliability or segmentation of server-driven push.
- Some platforms may coalesce or delay delivery slightly; this is acceptable for reminder use.

## Verification

Verification should confirm:
- Three `learning-reminder` notifications are scheduled after setup
- Their trigger configuration is repeating rather than one-time
- Re-running setup does not increase the count beyond three
- Disabling notifications removes scheduled reminders
- Re-enabling notifications restores the three repeating reminders

## Testing Plan

Add or update tests around the notification service scheduling logic where practical. If automated coverage is limited by Expo notification APIs, verify with focused runtime inspection of scheduled notifications returned by `getAllScheduledNotificationsAsync()`.
