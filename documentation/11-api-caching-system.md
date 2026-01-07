# API Caching System - Usage Guide

## Overview
Your app now implements a **3-tier caching strategy** for sections, levels, and questions with a **30-day cache duration**. This significantly reduces API calls and improves performance.

## Caching Layers

### 1. Redux Store (Fastest - In-Memory)
- First check, instant access
- Lost on app restart
- Persisted via redux-persist

### 2. AsyncStorage (Persistent - Offline)
- Second check, very fast
- Survives app restarts
- Survives for 30 days

### 3. Backend API (Authoritative)
- Only called if cache is expired or missing
- Data is saved to both Redux and AsyncStorage

## Cache Duration
**30 days** for all learning content (sections, levels, questions)

## How to Use

### Standard Usage (Recommended)
Use `cachedBackendApi` instead of `backendApi` for sections, levels, and questions:

```typescript
import cachedBackendApi from '../../services/cachedBackendApi';

// Get sections (cached)
const sections = await cachedBackendApi.getSections();

// Get levels (cached)
const levels = await cachedBackendApi.getLevels(sectionId);

// Get questions (cached)
const questions = await cachedBackendApi.getQuestions(levelId, 10, 'mixed');
```

### Force Refresh (When Needed)
If you need to bypass cache and fetch fresh data:

```typescript
// Force refresh sections
const sections = await cachedBackendApi.refreshSections();

// Force refresh levels
const levels = await cachedBackendApi.refreshLevels(sectionId);

// Force refresh questions
const questions = await cachedBackendApi.refreshQuestions(levelId, 10, 'mixed');
```

### Manual Cache Management

```typescript
import cacheService from '../../services/cacheService';

// Clear all learning content cache
await cacheService.clearLearningCache();

// Clear specific items
await cacheService.invalidateSections();
await cacheService.invalidateLevels(sectionId);
await cacheService.invalidateQuestions(levelId);
```

### Redux Actions

```typescript
import { 
  clearLearningCache, 
  invalidateSections,
  invalidateLevels,
  invalidateQuestions
} from '../store/slices/learningSlice';
import { useDispatch } from 'react-redux';

const dispatch = useDispatch();

// Clear all Redux cache
dispatch(clearLearningCache());

// Invalidate specific caches
dispatch(invalidateSections());
dispatch(invalidateLevels(sectionId));
dispatch(invalidateQuestions(levelId));
```

## Files Modified

### New Files Created
- `src/store/slices/learningSlice.ts` - Redux slice for learning content
- `src/services/cachedBackendApi.ts` - Cached API wrapper

### Files Enhanced
- `src/services/cacheService.ts` - Added sections, levels, questions caching
- `src/services/backendApi.ts` - Added request deduplication
- `src/store/index.ts` - Added learning slice to Redux store

### Files Updated to Use Caching
- `src/screens/main/HomeScreen.tsx`
- `src/screens/game/QuestionScreen.tsx`
- `src/services/auth.ts`
- `src/services/levelProgress.ts`
- `src/services/learningService.ts`
- `src/services/questions.ts`

## Benefits

1. **Reduced API Calls**: Data cached for 30 days
2. **Faster Loading**: Instant access from Redux/AsyncStorage
3. **Offline Support**: Works even without internet (if cached)
4. **Bandwidth Savings**: Fewer network requests
5. **Better UX**: Smoother, faster app experience
6. **Request Deduplication**: Multiple simultaneous requests for same data are merged

## Cache Logs

The system logs cache operations to help with debugging:

```
✅ Sections from Redux cache
✅ Levels for abc123 from AsyncStorage cache (5 days old)
🌐 Fetching questions for xyz789 from API
💾 Questions for xyz789 saved to cache
📦 Sections cache age: 12 days, valid: true
```

## When to Force Refresh

Force refresh should be used sparingly, only when:
- User explicitly requests fresh data (pull-to-refresh)
- You know backend data has changed
- After content updates/uploads
- For admin/testing purposes

## Cache Expiry

Caches automatically expire after **30 days**. When expired:
- Old data is ignored
- Fresh data is fetched from API
- New cache timestamp is set

## Testing Cache

To test the caching system:

1. First load: Should fetch from API
2. Second load: Should use cached data
3. After 30 days: Should fetch fresh data
4. Offline: Should work with cached data

Check console logs to verify cache behavior.
