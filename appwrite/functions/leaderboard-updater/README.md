# leaderboard-updater

Monthly Appwrite job for leaderboard reset.

## Required environment variables

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_USERS_COLLECTION_ID`
- `APPWRITE_LEADERBOARD_COLLECTION_ID`

## Expected schedule

- Cron: `0 0 1 * *`
- Time zone: `Africa/Lagos`

## Behavior

- Sets every user document `monthlyXP` to `0`
- Sets every user document `lastMonthlyReset` to the new `YYYY-MM` month key
- Leaves `xp` and `totalXP` unchanged
- Zeroes `monthlyXP` in current-month leaderboard snapshot rows
