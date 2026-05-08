# Learning Cache System

## Overview

MoneyQuest uses a mixed in-memory and persistent cache for learning-path data.

The current implementation lives in:

- [src/services/cacheService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/cacheService.ts:1)
- [src/services/cachedBackendApi.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/cachedBackendApi.ts:1)
- [src/store/slices/learningSlice.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/store/slices/learningSlice.ts:1)

## What Is Cached

### Persisted

- Sections
- Levels per section
- Completed level IDs
- Cache version metadata

### Not persisted the same way

- Questions are requested through `backendApi.getLevelQuestions(...)`
- Question requests are session-deduplicated
- `hasCachedQuestions()` currently returns `false`

So sections and levels have the strongest cache behavior; questions are lighter-weight.

## Cache Layers

### Redux store

- Fastest read path
- Used first for sections and levels
- Includes timestamps in the learning slice

### AsyncStorage

- Persistent fallback for sections, levels, and completed level IDs
- Used when Redux does not have valid data

### Backend API

- Used when cache is missing or stale
- Also used as refresh fallback before stale cached data is discarded

## TTL and Freshness

Cache freshness is controlled by `MONEYQUEST_CACHE_TTL_SECONDS`.

Current behavior:

- If the env value is valid and greater than `0`, that TTL is used
- Otherwise the code falls back to `60 * 60 * 1000` ms, which is `1 hour`
- The default env fallback in `environment.ts` is `259200` seconds, which is `3 days`

In practice, the normal configured TTL is 3 days unless overridden.

## Initialization and Versioning

`cacheService.initialize()` checks `LEARNING_CACHE_VERSION`.

If the stored version differs:

- learning-path cache is cleared
- the new version is written
- fetch-session tracking is reset

This avoids stale persisted structures surviving schema or behavior changes.

## Read Flow

### Sections

`cachedBackendApi.getSections()` currently does:

1. Initialize cache if needed
2. Read Redux sections and timestamp
3. If Redux is fresh, return it
4. If Redux is stale, try backend refresh and fall back to stale Redux on failure
5. If Redux is empty, try AsyncStorage
6. If AsyncStorage is stale, try backend refresh and fall back to stale storage on failure
7. If nothing exists, fetch from backend and persist

### Levels

`cachedBackendApi.getLevels(sectionId)` follows the same pattern per section ID.

### Questions

`cachedBackendApi.getQuestions(levelId, ...)` currently:

- prevents duplicate in-session requests for the same level
- waits briefly if a request is already in flight
- fetches from backend
- returns the response questions array

It does not currently persist questions to Redux or AsyncStorage the way the older docs implied.

## Manual Refresh

`cachedBackendApi.forceRefreshLearningPath()`:

- fetches fresh sections
- clears persisted learning-path cache
- clears Redux learning cache
- stores the refreshed sections
- fetches and stores levels for each section

Use this when the backend learning structure has changed and you want a full client refresh.

## Cache Clearing

`cacheService.clearLearningPathCache()` removes:

- persisted sections
- persisted level caches
- persisted question cache keys and timestamps
- background-refresh flags

It intentionally does not remove user progress caches like completed levels.

## Practical Implications

- Learning screens can work from cached sections and levels after app restart
- Stale cached data is still used if refresh fails, which improves resilience
- Question content remains backend-driven per request
- Cache behavior is environment-sensitive through the TTL setting
