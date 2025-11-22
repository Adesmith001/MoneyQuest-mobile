# MoneyQuest Backend Integration Setup Checklist

## ✅ Completed Tasks

### 1. Backend API Integration
- ✅ Created `src/services/backendApi.ts` with all API endpoints
- ✅ Created `src/services/lives.ts` for lives management (5 max, 1/hour regen)
- ✅ Created `src/services/levelProgress.ts` for progress tracking
- ✅ Updated type definitions in `src/types/index.ts`

### 2. Screen Updates
- ✅ Updated `QuestionScreen.tsx` to use backend API
  - Removed matching question support (backend only supports selection)
  - Updated to use BackendQuestion format (options as {A, B, C, D})
  - Added XP saving to Appwrite on level completion
- ✅ Updated `HomeScreen.tsx` to fetch levels from backend
- ✅ Updated `ProfileScreen.tsx` with lives timer and monthly XP display

### 3. User Schema Extensions
- ✅ Updated auth service to initialize new fields:
  - `lives: 5`
  - `lastLifeRegenTime: currentDate`
  - `currentLevelId: null`
  - `currentSectionId: null`
  - `totalXP: 0`
  - `monthlyXP: 0`

## ⚠️ Required Manual Setup

### 1. Appwrite Console Configuration
You MUST add these attributes to your Users collection in Appwrite Console:

1. Go to https://cloud.appwrite.io
2. Navigate to your MoneyQuest project
3. Open the Users collection
4. Go to "Attributes" tab
5. Add these attributes:

| Attribute Name | Type | Default | Required | Array |
|----------------|------|---------|----------|-------|
| lives | Integer | 5 | No | No |
| lastLifeRegenTime | String | - | No | No |
| currentLevelId | String | - | No | No |
| currentSectionId | String | - | No | No |
| totalXP | Integer | 0 | No | No |
| monthlyXP | Integer | 0 | No | No |

**Note:** After adding attributes, existing users will need to log out and log back in, or you'll need to manually update their records.

### 2. Backend Section/Level ID Configuration

✅ **COMPLETED** - The app now automatically fetches sections and levels from the backend!

The HomeScreen fetches:
1. All sections from `/upload/list` endpoint
2. Levels for each section from `/levels?section_id={id}` endpoint
3. Questions from `/questions?level_id={id}` endpoint

No manual configuration needed!

### 3. Learning Path Configuration (Optional)

The file `src/config/learningPath.ts` has a placeholder structure. You can:
- Keep it simple and only store section IDs (current approach)
- Or populate it with the full learning path structure if you want client-side caching

## 🧪 Testing Checklist

After completing the manual setup above, test these features:

### Lives System
- [ ] User starts with 5 lives
- [ ] Lives decrease when answering incorrectly
- [ ] Lives regenerate 1 per hour
- [ ] Timer shows correct time until next life
- [ ] Lives don't exceed 5 maximum

### Questions
- [ ] Questions load from backend
- [ ] Options display correctly (A, B, C, D format)
- [ ] Correct answers award XP
- [ ] Incorrect answers deduct lives
- [ ] Level completion works

### XP System
- [ ] XP increases on correct answers (10 XP per answer)
- [ ] XP saves to Appwrite after level completion
- [ ] Monthly XP displays on profile
- [ ] Monthly XP countdown timer shows correct days
- [ ] XP resets on first of month (check `levelProgress.ts` reset logic)

### Progress Tracking
- [ ] Current level/section saves to Appwrite
- [ ] User can continue from where they left off
- [ ] HomeScreen shows correct progress state
- [ ] Level unlocking works properly

### UI/UX
- [ ] Loading screens display during data fetches
- [ ] Error messages show if API fails
- [ ] Profile screen updates in real-time
- [ ] Navigation works correctly

## 📝 Known Limitations

1. **Question Types:** Backend only supports selection questions. Audio and matching types are not available.
2. **Section Metadata:** Section titles are currently hardcoded. Consider adding section metadata to backend.
3. **Progress API:** The `getUserLevelProgress` endpoint exists but isn't fully integrated. Future enhancement: use it to show completed levels.
4. **Offline Support:** App requires backend connection. Consider adding offline question caching.

## 🚀 Next Steps (Optional Enhancements)

1. **Leaderboard:** Implement monthly leaderboard using `monthlyXP` field
2. **Achievements:** Add achievement tracking for milestones
3. **Audio Questions:** If backend adds TTS support, integrate `generateTTS()` endpoint
4. **Analytics:** Track user learning patterns via backend
5. **Push Notifications:** Remind users when lives are full
6. **Social Features:** Add friend comparisons and challenges

## 📚 Documentation

- `BACKEND_INTEGRATION.md` - Full API documentation
- `BACKEND_MIGRATION_GUIDE.md` - Migration guide from old structure
- `src/services/backendApi.ts` - API client code
- `src/services/lives.ts` - Lives system implementation
- `src/services/levelProgress.ts` - Progress tracking implementation

## 🆘 Troubleshooting

### "Date value out of bounds" error
- Fixed in `src/services/lives.ts` with date validation
- If you still see this, ensure `lastLifeRegenTime` is a valid ISO string

### Questions not loading
1. Check backend is accessible: https://moneyquestproject-demo-production.up.railway.app/health
2. Verify section IDs are correct in HomeScreen.tsx
3. Check network requests in React Native Debugger

### XP not saving
1. Verify Appwrite attributes are created (see section 1 above)
2. Check QuestionScreen handleContinue function runs without errors
3. Verify user document updates in Appwrite console

### Lives not regenerating
1. Check `lastLifeRegenTime` is stored as ISO string in Appwrite
2. Verify `calculateCurrentLives()` logic in `src/services/lives.ts`
3. Check ProfileScreen useEffect interval is running

## 💾 Database Schema

### User Document Structure
```typescript
{
  $id: string;
  username: string;
  email: string;
  avatar: number;
  lives: number;              // NEW: Current lives (0-5)
  lastLifeRegenTime: string;  // NEW: ISO date string
  currentLevelId: string;     // NEW: Current level UUID
  currentSectionId: string;   // NEW: Current section UUID  
  totalXP: number;            // NEW: All-time XP
  monthlyXP: number;          // NEW: XP this month (resets monthly)
  currentStreak: number;
  bestStreak: number;
  lastLoginDate: string;
  createdAt: string;
  updatedAt: string;
}
```

---

**Need Help?** Check the backend API documentation or React Native logs for detailed error messages.
