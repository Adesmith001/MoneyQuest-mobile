import { getQuestsScreenState } from "../src/screens/game/questsScreenState";
import { QuestTabEntry } from "../src/types/gamification";

const createQuest = (
  overrides: Partial<QuestTabEntry> = {}
): QuestTabEntry => ({
  quest_definition_id: "quest-1",
  code: "quest-code",
  name: "Quest",
  description: "Quest description",
  quest_type: "DAILY",
  current_value: 0,
  target_value: 1,
  status: "NOT_STARTED",
  reward: null,
  reset_at: null,
  ...overrides,
});

const assertEqual = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${String(actual)}`);
  }
};

{
  const state = getQuestsScreenState([]);

  assertEqual(
    state.emptyMode,
    "no-quests",
    "shows a no-quests state when no quests are available"
  );
  assertEqual(state.activeChallenges.length, 0, "has no active challenges");
  assertEqual(state.hallOfFame.length, 0, "has no completed quests");
}

{
  const state = getQuestsScreenState([
    createQuest({
      quest_definition_id: "quest-2",
      status: "COMPLETED",
      current_value: 1,
    }),
    createQuest({
      quest_definition_id: "quest-3",
      status: "CLAIMED",
      current_value: 1,
    }),
  ]);

  assertEqual(
    state.emptyMode,
    "all-completed",
    "shows an all-completed state when only completed quests remain"
  );
  assertEqual(state.activeChallenges.length, 0, "has no active challenges left");
  assertEqual(state.hallOfFame.length, 2, "keeps completed quests visible");
}

{
  const state = getQuestsScreenState([
    createQuest({
      quest_definition_id: "quest-4",
      status: "IN_PROGRESS",
      current_value: 1,
      target_value: 3,
    }),
    createQuest({
      quest_definition_id: "quest-5",
      status: "COMPLETED",
      current_value: 1,
    }),
  ]);

  assertEqual(
    state.emptyMode,
    "none",
    "does not show an empty state while active quests exist"
  );
  assertEqual(state.activeChallenges.length, 1, "keeps active quests visible");
  assertEqual(state.hallOfFame.length, 1, "keeps completed quests visible");
}
