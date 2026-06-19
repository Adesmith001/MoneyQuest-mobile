export type SectionIdentity = {
  id: string;
};

export type QuestionRemovalResult<T> = {
  questions: T[];
  nextIndex: number;
};

export type LivesRefreshSource = 'passive-refresh' | 'scheduled-trigger';

export type LifeDeductionResult = {
  lives: number;
  lastLifeRegenTime: string;
};

export type StreakDisplaySource = {
  currentStreak?: unknown;
  weeklyStreak?: unknown;
  streak?: unknown;
  loginHistory?: unknown;
};

export type ProgressState = {
  isUnlocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
};

export type LevelProgressInput = {
  sectionId: string;
  levelId: string;
  levelIndex: number;
  sectionLevelIds: string[];
  completedLevelIds: Set<string>;
  currentSectionId?: string | null;
  currentLevelId?: string | null;
};

export type LevelEnterableInput = {
  targetLevelId: string;
  sectionLevelIds: string[];
  completedLevelIds: Set<string>;
};

export type RegularSectionProgress = {
  id: string;
  levelIds: string[];
};

export type NextPlayableLevelTargetInput = {
  currentSectionId: string;
  completedLevelIds: Set<string>;
  regularSections: RegularSectionProgress[];
};

export type RecapLevelProgressInput = {
  recapSectionId: string;
  recapLevelId: string;
  recapLevelIndex: number;
  recapLevelIds: string[];
  sourceLevelIds: string[];
  completedLevelIds: Set<string>;
  currentSectionId?: string | null;
  currentLevelId?: string | null;
};

export type RecapSourceLevelLookupSection = {
  id: string;
  title?: string;
  regularSectionNumber?: number;
  levels: Array<{ levelId: string }>;
};

export type RecapSourceLevelLookupInput = {
  sourceSectionId?: string | null;
  sourceSectionNumber?: number | null;
  sourceSectionTitle?: string | null;
  builtSections: RecapSourceLevelLookupSection[];
};

export type LevelRenderItem<T> = {
  node: T;
  pathIndex: number;
  isLast: boolean;
};

const MAX_LIVES = 5;

export const getInitialSectionIndex = (
  sections: SectionIdentity[],
  savedSectionId?: string | null,
  fallbackIndex: number = 0
): number => {
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

export const removeQuestionAtIndex = <T>(
  questions: T[],
  currentIndex: number
): QuestionRemovalResult<T> => {
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

export const shouldSendLivesRestoredNotification = (
  previousLives: number,
  nextLives: number,
  source: LivesRefreshSource
): boolean => {
  return source === 'scheduled-trigger' && previousLives < MAX_LIVES && nextLives >= MAX_LIVES;
};

export const getLifeDeductionResult = (
  availableLives: number,
  lastLifeRegenTime: string,
  nowIso: string
): LifeDeductionResult => {
  const nextLives = Math.max(0, availableLives - 1);

  return {
    lives: nextLives,
    lastLifeRegenTime: availableLives >= 5 ? nowIso : lastLifeRegenTime,
  };
};

export const getLevelCompletionLives = (currentLives: number): number => {
  const normalized = Number.isFinite(currentLives) ? currentLives : MAX_LIVES;
  return Math.max(0, Math.min(MAX_LIVES, normalized + 1));
};

export const getSectionPlayableLevelId = (
  sectionLevelIds: string[],
  completedLevelIds: Set<string>
): string | null => {
  for (const levelId of sectionLevelIds) {
    if (!completedLevelIds.has(levelId)) {
      return levelId;
    }
  }

  return null;
};

export const isLevelEnterable = ({
  targetLevelId,
  sectionLevelIds,
  completedLevelIds,
}: LevelEnterableInput): boolean => {
  if (completedLevelIds.has(targetLevelId)) {
    return true;
  }

  return getSectionPlayableLevelId(sectionLevelIds, completedLevelIds) === targetLevelId;
};

export const getNextPlayableLevelTarget = ({
  currentSectionId,
  completedLevelIds,
  regularSections,
}: NextPlayableLevelTargetInput): { sectionId: string; levelId: string } | null => {
  const currentSectionIndex = regularSections.findIndex((section) => section.id === currentSectionId);

  if (currentSectionIndex < 0) {
    return null;
  }

  for (let index = currentSectionIndex; index < regularSections.length; index += 1) {
    const section = regularSections[index];
    const playableLevelId = getSectionPlayableLevelId(section.levelIds, completedLevelIds);

    if (playableLevelId) {
      return {
        sectionId: section.id,
        levelId: playableLevelId,
      };
    }
  }

  return null;
};

export const getLevelProgressState = ({
  sectionId,
  levelId,
  levelIndex,
  sectionLevelIds,
  completedLevelIds,
  currentSectionId,
  currentLevelId,
}: LevelProgressInput): ProgressState => {
  const isCompleted = completedLevelIds.has(levelId);
  const isCurrent = sectionId === currentSectionId && levelId === currentLevelId;
  const playableLevelId = getSectionPlayableLevelId(sectionLevelIds, completedLevelIds);

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

export const getRecapLevelProgressState = ({
  recapSectionId,
  recapLevelId,
  recapLevelIndex,
  recapLevelIds,
  sourceLevelIds,
  completedLevelIds,
  currentSectionId,
  currentLevelId,
}: RecapLevelProgressInput): ProgressState => {
  const isCompleted = completedLevelIds.has(recapLevelId);
  const isCurrent = recapSectionId === currentSectionId && recapLevelId === currentLevelId;
  const sourceSectionCompleted =
    sourceLevelIds.length > 0 && sourceLevelIds.every((levelId) => completedLevelIds.has(levelId));

  return {
    isUnlocked: isCompleted || isCurrent || sourceSectionCompleted,
    isCompleted,
    isCurrent,
  };
};

const normalizeSectionTitle = (title?: string | null): string => {
  return (title ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
};

export const resolveRecapSourceLevelIds = ({
  sourceSectionId,
  sourceSectionNumber,
  sourceSectionTitle,
  builtSections,
}: RecapSourceLevelLookupInput): string[] => {
  const titleKey = normalizeSectionTitle(sourceSectionTitle);
  const matchedSection =
    builtSections.find((section) => sourceSectionId && section.id === sourceSectionId) ??
    builtSections.find(
      (section) =>
        typeof sourceSectionNumber === 'number' &&
        section.regularSectionNumber === sourceSectionNumber
    ) ??
    builtSections.find((section) => titleKey.length > 0 && normalizeSectionTitle(section.title) === titleKey);

  return matchedSection?.levels.map((level) => level.levelId) ?? [];
};

export const getRecapSectionNumberForCompletedRegularSections = (
  regularSectionsProcessed: number
): number | null => {
  if (regularSectionsProcessed <= 0 || regularSectionsProcessed % 9 !== 0) {
    return null;
  }

  return Math.floor(regularSectionsProcessed / 9) * 10;
};

export const getTopFirstLevelRenderItems = <T>(levels: T[]): LevelRenderItem<T>[] => {
  return levels.map((node, index) => ({
    node,
    pathIndex: index,
    isLast: index === levels.length - 1,
  }));
};

const toSafeStreakNumber = (value: unknown): number => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

export const selectLeaderboardStreak = (source: StreakDisplaySource): number => {
  if (Array.isArray(source.loginHistory)) {
    const historyStreak = getCurrentStreakFromHistory(source.loginHistory);
    if (historyStreak > 0) {
      return historyStreak;
    }
  }

  return toSafeStreakNumber(source.currentStreak ?? source.streak ?? source.weeklyStreak ?? 0);
};

const parseLocalDateKey = (dateKey: string): Date | null => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const formatLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentStreakFromHistory = (
  loginHistory: unknown[],
  todayKey: string = formatLocalDateKey(new Date())
): number => {
  const activeDays = new Set(
    loginHistory.filter((day): day is string => typeof day === 'string' && day.length > 0)
  );

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
