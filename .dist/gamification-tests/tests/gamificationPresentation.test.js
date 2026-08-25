"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gamificationPresentation_1 = require("../src/utils/gamificationPresentation");
const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
    }
};
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
const makeStreak = (status) => ({
    user_id: 'user-1',
    previous_streak: 1,
    current_streak: 2,
    longest_streak: 2,
    business_date: '2026-08-25',
    status,
    incremented: true,
    reset: false,
    increased_today: true,
    already_counted_today: false,
    out_of_order: false,
    source_event_id: 'event-1',
    policy_applied: null,
    milestone_candidates: [],
    message: null,
});
const bundle = {
    event_id: 'event-1',
    event_type: 'LESSON_COMPLETED',
    user_id: 'user-1',
    source: 'lesson',
    source_reference: 'level-1',
    processing_status: 'PROCESSED',
    xp_delta: 50,
    streak: makeStreak('CONTINUED'),
    badges: [
        {
            badge_definition_id: 'badge-1',
            badge_code: 'FIRST_STEP',
            badge_name: 'First Step',
            was_awarded: true,
            already_owned: false,
            award_cycle: 'lifetime',
            user_badge_id: 'user-badge-1',
            progress_value: 1,
            target_value: 1,
            reward_config: {},
            message: null,
        },
    ],
    quests: [
        {
            quest_definition_id: 'quest-1',
            quest_instance_id: 'instance-1',
            quest_code: 'DAILY_1',
            quest_name: 'Wisdom Seeker',
            period_key: '2026-08-25',
            old_progress: 0,
            new_progress: 1,
            target_value: 3,
            status: 'IN_PROGRESS',
            was_completed_now: false,
            reward: null,
            attached_badge: null,
            message: null,
        },
        {
            quest_definition_id: 'quest-2',
            quest_instance_id: 'instance-2',
            quest_code: 'RAPID_FIRE',
            quest_name: 'Rapid Fire',
            period_key: '2026-08-25',
            old_progress: 9,
            new_progress: 10,
            target_value: 10,
            status: 'COMPLETED',
            was_completed_now: true,
            reward: null,
            attached_badge: null,
            message: null,
        },
    ],
    rewards: [],
    chests: [],
    celebration_order: [],
    primary_celebration: null,
    summary: null,
    errors: [],
    processed_at: '2026-08-25T10:00:00.000Z',
};
const celebrations = (0, gamificationPresentation_1.buildCelebrationsFromBundle)(bundle);
assertEqual(celebrations.length, 2, 'builds celebrations for awarded badges and completed quests');
assertEqual(celebrations[0].hero_element, 'badge', 'badge celebration uses badge hero');
assertEqual(celebrations[1].completed_quests[0], 'RAPID_FIRE', 'quest celebration keeps backend quest code');
assertEqual((0, gamificationPresentation_1.getStreakMessage)(makeStreak('CONTINUED')), 'Streak extended!', 'shows streak-extended copy for continued streaks');
assertEqual((0, gamificationPresentation_1.getStreakMessage)(makeStreak('STARTED')), 'Streak started!', 'shows streak-started copy for new streaks');
assertEqual((0, gamificationPresentation_1.getStreakMessage)(makeStreak('ALREADY_COUNTED_TODAY')), null, 'does not show streak copy when streak was already counted today');
assertEqual((0, gamificationPresentation_1.getQuestHeroTitle)(bundle.quests[0], 1), 'Daily Quest', 'uses the generic quest title for partial quest progress');
assertEqual((0, gamificationPresentation_1.getQuestHeroTitle)(bundle.quests[1], 1), 'Quest Complete!', 'uses completion title when the quest completed now');
assert((0, gamificationPresentation_1.buildCelebrationsFromBundle)({
    ...bundle,
    badges: [],
    quests: [],
    chests: [],
}).length === 0, 'returns no celebrations when the bundle has no celebratory events');
