import { QuestTabEntry } from "../../types/gamification";

export type QuestsEmptyMode = "none" | "no-quests" | "all-completed";

export interface QuestsScreenState {
  activeChallenges: QuestTabEntry[];
  hallOfFame: QuestTabEntry[];
  emptyMode: QuestsEmptyMode;
}

export const getQuestsScreenState = (
  quests: QuestTabEntry[]
): QuestsScreenState => {
  const activeChallenges = quests.filter(
    (quest) => quest.status === "IN_PROGRESS" || quest.status === "NOT_STARTED"
  );
  const hallOfFame = quests.filter(
    (quest) => quest.status === "COMPLETED" || quest.status === "CLAIMED"
  );

  if (quests.length === 0) {
    return {
      activeChallenges,
      hallOfFame,
      emptyMode: "no-quests",
    };
  }

  if (activeChallenges.length === 0 && hallOfFame.length > 0) {
    return {
      activeChallenges,
      hallOfFame,
      emptyMode: "all-completed",
    };
  }

  return {
    activeChallenges,
    hallOfFame,
    emptyMode: "none",
  };
};
