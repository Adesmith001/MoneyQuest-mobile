"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuestsScreenState = void 0;
const getQuestsScreenState = (quests) => {
    const activeChallenges = quests.filter((quest) => quest.status === "IN_PROGRESS" || quest.status === "NOT_STARTED");
    const hallOfFame = quests.filter((quest) => quest.status === "COMPLETED" || quest.status === "CLAIMED");
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
exports.getQuestsScreenState = getQuestsScreenState;
