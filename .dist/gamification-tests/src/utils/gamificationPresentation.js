"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCelebrationsFromBundle = buildCelebrationsFromBundle;
exports.getStreakMessage = getStreakMessage;
exports.getQuestHeroTitle = getQuestHeroTitle;
exports.getChestHeroTitle = getChestHeroTitle;
function buildCelebrationsFromBundle(bundle) {
    const celebrations = [];
    if (bundle.primary_celebration) {
        celebrations.push(bundle.primary_celebration);
    }
    for (const badge of bundle.badges) {
        if (!badge.was_awarded)
            continue;
        celebrations.push({
            celebration_type: 'BADGE_UNLOCK',
            hero_element: 'badge',
            xp_earned: 0,
            streak_status: null,
            next_badge_progress: bundle.summary?.next_badge_progress ?? null,
            unlocked_badges: [badge.badge_code],
            completed_quests: [],
            section_completion: null,
        });
    }
    for (const quest of bundle.quests) {
        if (!quest.was_completed_now)
            continue;
        celebrations.push({
            celebration_type: 'QUEST_COMPLETED',
            hero_element: 'quest',
            xp_earned: 0,
            streak_status: null,
            next_badge_progress: bundle.summary?.next_badge_progress ?? null,
            unlocked_badges: [],
            completed_quests: [quest.quest_code],
            section_completion: null,
        });
    }
    for (const chest of bundle.chests) {
        if (!chest.was_claimed_now)
            continue;
        celebrations.push({
            celebration_type: 'CHEST_CLAIMED',
            hero_element: 'chest',
            xp_earned: 0,
            streak_status: null,
            next_badge_progress: bundle.summary?.next_badge_progress ?? null,
            unlocked_badges: [],
            completed_quests: [],
            section_completion: null,
        });
    }
    return celebrations;
}
function getStreakMessage(streak) {
    if (!streak)
        return null;
    switch (streak.status) {
        case 'CONTINUED':
            return 'Streak extended!';
        case 'STARTED':
            return 'Streak started!';
        case 'RESET':
            return 'New streak started!';
        default:
            return null;
    }
}
function getQuestHeroTitle(quest, xpEarned) {
    if (quest?.was_completed_now) {
        return 'Quest Complete!';
    }
    if (xpEarned > 0) {
        return 'Daily Quest';
    }
    return 'Quest Update';
}
function getChestHeroTitle(chest) {
    if (chest?.already_claimed) {
        return 'Chest Already Claimed';
    }
    return 'Chest Unlocked!';
}
