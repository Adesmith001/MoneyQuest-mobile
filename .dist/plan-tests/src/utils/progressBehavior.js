"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentStreakFromHistory = exports.getWeeklyActivityCount = exports.getCurrentWeekActivity = exports.selectLeaderboardStreak = exports.getTopFirstLevelRenderItems = exports.getRecapSectionNumberForCompletedRegularSections = exports.resolveRecapSourceLevelIds = exports.getRecapLevelProgressState = exports.getLevelProgressState = exports.getNextPlayableLevelTarget = exports.isLevelEnterable = exports.getSectionPlayableLevelId = exports.getLevelCompletionLives = exports.getLifeDeductionResult = exports.shouldSendLivesRestoredNotification = exports.removeQuestionAtIndex = exports.getInitialSectionIndex = void 0;
const MAX_LIVES = 5;
const getInitialSectionIndex = (sections, savedSectionId, fallbackIndex = 0) => {
    if (savedSectionId) {
        const savedIndex = sections.findIndex((section) => section.id === savedSectionId);
        if (savedIndex >= 0) {
            return savedIndex;
        }
    }
    if (fallbackIndex >= 0 && fallbackIndex < sections.length) {
        return fallbackIndex;
    }
    return 0;
};
exports.getInitialSectionIndex = getInitialSectionIndex;
const removeQuestionAtIndex = (questions, currentIndex) => {
    if (currentIndex < 0 || currentIndex >= questions.length) {
        return { questions, nextIndex: Math.max(0, Math.min(currentIndex, questions.length - 1)) };
    }
    const nextQuestions = questions.filter((_, index) => index !== currentIndex);
    const nextIndex = nextQuestions.length === 0
        ? 0
        : Math.min(currentIndex, nextQuestions.length - 1);
    return {
        questions: nextQuestions,
        nextIndex,
    };
};
exports.removeQuestionAtIndex = removeQuestionAtIndex;
const shouldSendLivesRestoredNotification = (previousLives, nextLives, source) => {
    return source === 'scheduled-trigger' && previousLives < MAX_LIVES && nextLives >= MAX_LIVES;
};
exports.shouldSendLivesRestoredNotification = shouldSendLivesRestoredNotification;
const getLifeDeductionResult = (availableLives, lastLifeRegenTime, nowIso) => {
    const nextLives = Math.max(0, availableLives - 1);
    return {
        lives: nextLives,
        lastLifeRegenTime: availableLives >= 5 ? nowIso : lastLifeRegenTime,
    };
};
exports.getLifeDeductionResult = getLifeDeductionResult;
const getLevelCompletionLives = (currentLives) => {
    const normalized = Number.isFinite(currentLives) ? currentLives : MAX_LIVES;
    return Math.max(0, Math.min(MAX_LIVES, normalized + 1));
};
exports.getLevelCompletionLives = getLevelCompletionLives;
const getSectionPlayableLevelId = (sectionLevelIds, completedLevelIds) => {
    for (const levelId of sectionLevelIds) {
        if (!completedLevelIds.has(levelId)) {
            return levelId;
        }
    }
    return null;
};
exports.getSectionPlayableLevelId = getSectionPlayableLevelId;
const isLevelEnterable = ({ targetLevelId, sectionLevelIds, completedLevelIds, }) => {
    if (completedLevelIds.has(targetLevelId)) {
        return true;
    }
    return (0, exports.getSectionPlayableLevelId)(sectionLevelIds, completedLevelIds) === targetLevelId;
};
exports.isLevelEnterable = isLevelEnterable;
const getNextPlayableLevelTarget = ({ currentSectionId, completedLevelIds, regularSections, }) => {
    const currentSectionIndex = regularSections.findIndex((section) => section.id === currentSectionId);
    if (currentSectionIndex < 0) {
        return null;
    }
    for (let index = currentSectionIndex; index < regularSections.length; index += 1) {
        const section = regularSections[index];
        const playableLevelId = (0, exports.getSectionPlayableLevelId)(section.levelIds, completedLevelIds);
        if (playableLevelId) {
            return {
                sectionId: section.id,
                levelId: playableLevelId,
            };
        }
    }
    return null;
};
exports.getNextPlayableLevelTarget = getNextPlayableLevelTarget;
const getLevelProgressState = ({ sectionId, levelId, levelIndex, sectionLevelIds, completedLevelIds, currentSectionId, currentLevelId, }) => {
    const isCompleted = completedLevelIds.has(levelId);
    const isCurrent = sectionId === currentSectionId && levelId === currentLevelId;
    const playableLevelId = (0, exports.getSectionPlayableLevelId)(sectionLevelIds, completedLevelIds);
    if (isCompleted) {
        return { isUnlocked: true, isCompleted: true, isCurrent };
    }
    if (playableLevelId === levelId) {
        return { isUnlocked: true, isCompleted: false, isCurrent: true };
    }
    return {
        isUnlocked: false,
        isCompleted: false,
        isCurrent: false,
    };
};
exports.getLevelProgressState = getLevelProgressState;
const getRecapLevelProgressState = ({ recapSectionId, recapLevelId, recapLevelIndex, recapLevelIds, sourceLevelIds, completedLevelIds, currentSectionId, currentLevelId, }) => {
    const isCompleted = completedLevelIds.has(recapLevelId);
    const isCurrent = recapSectionId === currentSectionId && recapLevelId === currentLevelId;
    const sourceSectionCompleted = sourceLevelIds.length > 0 && sourceLevelIds.every((levelId) => completedLevelIds.has(levelId));
    return {
        isUnlocked: isCompleted || isCurrent || sourceSectionCompleted,
        isCompleted,
        isCurrent,
    };
};
exports.getRecapLevelProgressState = getRecapLevelProgressState;
const normalizeSectionTitle = (title) => {
    return (title ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
};
const resolveRecapSourceLevelIds = ({ sourceSectionId, sourceSectionNumber, sourceSectionTitle, builtSections, }) => {
    const titleKey = normalizeSectionTitle(sourceSectionTitle);
    const matchedSection = builtSections.find((section) => sourceSectionId && section.id === sourceSectionId) ??
        builtSections.find((section) => typeof sourceSectionNumber === 'number' &&
            section.regularSectionNumber === sourceSectionNumber) ??
        builtSections.find((section) => titleKey.length > 0 && normalizeSectionTitle(section.title) === titleKey);
    return matchedSection?.levels.map((level) => level.levelId) ?? [];
};
exports.resolveRecapSourceLevelIds = resolveRecapSourceLevelIds;
const getRecapSectionNumberForCompletedRegularSections = (regularSectionsProcessed) => {
    if (regularSectionsProcessed <= 0 || regularSectionsProcessed % 9 !== 0) {
        return null;
    }
    return Math.floor(regularSectionsProcessed / 9) * 10;
};
exports.getRecapSectionNumberForCompletedRegularSections = getRecapSectionNumberForCompletedRegularSections;
const getTopFirstLevelRenderItems = (levels) => {
    return levels.map((node, index) => ({
        node,
        pathIndex: index,
        isLast: index === levels.length - 1,
    }));
};
exports.getTopFirstLevelRenderItems = getTopFirstLevelRenderItems;
const toSafeStreakNumber = (value) => {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : 0;
};
const selectLeaderboardStreak = (source) => {
    if (Array.isArray(source.loginHistory)) {
        const historyStreak = (0, exports.getCurrentStreakFromHistory)(source.loginHistory);
        if (historyStreak > 0) {
            return historyStreak;
        }
    }
    return toSafeStreakNumber(source.currentStreak ?? source.streak ?? source.weeklyStreak ?? 0);
};
exports.selectLeaderboardStreak = selectLeaderboardStreak;
const parseLocalDateKey = (dateKey) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) {
        return null;
    }
    return new Date(year, month - 1, day);
};
const formatLocalDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getCurrentWeekActivity = (loginHistory, todayKey = formatLocalDateKey(new Date())) => {
    const today = parseLocalDateKey(todayKey);
    if (!today) {
        return [];
    }
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const activity = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return formatLocalDateKey(date);
    });
    return activity;
};
exports.getCurrentWeekActivity = getCurrentWeekActivity;
const getWeeklyActivityCount = (loginHistory, todayKey = formatLocalDateKey(new Date())) => {
    const activeDays = new Set(loginHistory.filter((day) => typeof day === 'string' && day.length > 0));
    return (0, exports.getCurrentWeekActivity)(loginHistory, todayKey).filter((dateKey) => activeDays.has(dateKey)).length;
};
exports.getWeeklyActivityCount = getWeeklyActivityCount;
const getCurrentStreakFromHistory = (loginHistory, todayKey = formatLocalDateKey(new Date())) => {
    const activeDays = new Set(loginHistory.filter((day) => typeof day === 'string' && day.length > 0));
    if (!activeDays.has(todayKey)) {
        return 0;
    }
    let streak = 0;
    const cursor = parseLocalDateKey(todayKey);
    if (!cursor) {
        return 0;
    }
    while (activeDays.has(formatLocalDateKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
};
exports.getCurrentStreakFromHistory = getCurrentStreakFromHistory;
