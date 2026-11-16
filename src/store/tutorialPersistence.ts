import type { store as appStore } from './index';
import { normalizeTutorialState, restoreTutorialProgress, type TutorialState } from './slices/tutorialSlice';

type TutorialStorage = {
  getItem(key: string): Promise<string | null>;
  mergeItem(key: string, value: string): Promise<void>;
};

const completionFields = [
  'hasCompletedAppTour',
  'latestFeatureTourVersionSeen',
  'hasSeenHomeTour',
  'hasSeenQuestionGuide',
  'hasSeenStreakGuide',
  'hasSeenProfileGuide',
] as const;

const initialTutorial = normalizeTutorialState(undefined);

export function watchTutorialProgress(
  store: Pick<typeof appStore, 'getState' | 'subscribe' | 'dispatch'>,
  storage: TutorialStorage,
) {
  let accountId: string | null = null;
  let loadVersion = 0;
  let rehydrated = false;
  let previousTutorial: TutorialState | undefined;

  async function saveChanges(key: string, previous: TutorialState, next: TutorialState) {
    const changedFields = completionFields.filter((field) => previous[field] !== next[field]);
    if (changedFields.length) {
      const changes = Object.fromEntries(changedFields.map((field) => [field, next[field]]));
      await storage.mergeItem(key, JSON.stringify(changes));
    }
  }

  return store.subscribe(() => {
    const { _persist, auth, tutorial } = store.getState();
    if (!_persist?.rehydrated) return;

    // Older versions stored the current account and its tutorials together.
    const legacyTutorial = rehydrated ? undefined : tutorial;
    rehydrated = true;
    const userId = auth.user?.$id ?? null;

    if (userId !== accountId) {
      accountId = userId;
      previousTutorial = undefined;
      const version = ++loadVersion;
      if (!userId) return;

      const key = `@moneyquest_tutorial_progress:${userId}`;
      void (async () => {
        let progress = legacyTutorial;
        try {
          const saved = await storage.getItem(key);
          if (saved !== null) {
            progress = JSON.parse(saved);
          } else if (legacyTutorial) {
            await saveChanges(key, initialTutorial, legacyTutorial);
          }
        } catch {
          // Continue with the available progress if browser or device storage is unavailable.
        }

        if (version !== loadVersion) return;
        const restored = { ...normalizeTutorialState(progress), accountId: userId };
        previousTutorial = restored;
        store.dispatch(restoreTutorialProgress(restored));
      })();
      return;
    }

    if (userId && tutorial.accountId === userId && previousTutorial && tutorial !== previousTutorial) {
      const key = `@moneyquest_tutorial_progress:${userId}`;
      const previous = previousTutorial;
      previousTutorial = tutorial;
      void saveChanges(key, previous, tutorial).catch(() => {});
    }
  });
}
