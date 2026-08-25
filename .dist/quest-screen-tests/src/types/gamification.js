"use strict";
// =============================================
// Gamification Types — mirrors backend Pydantic schemas
// =============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEST_TYPE_CONFIG = exports.BADGE_CATEGORY_CONFIG = void 0;
exports.getQuestStatusLabel = getQuestStatusLabel;
// ── Derived UI helpers ─────────────────────────
/** Badge category display config */
exports.BADGE_CATEGORY_CONFIG = {
    JOURNEY: { label: 'Journey', color: '#4CAF50', icon: '🌎' },
    SECTION: { label: 'Section', color: '#2196F3', icon: '📚' },
    CONSISTENCY: { label: 'Consistency', color: '#FF9800', icon: '🔥' },
    ACHIEVEMENT: { label: 'Achievement', color: '#9C27B0', icon: '🏆' },
    QUEST: { label: 'Quest', color: '#FF5722', icon: '⚔️' },
};
/** Quest type display config */
exports.QUEST_TYPE_CONFIG = {
    DAILY: { label: 'Daily', color: '#FF5722', icon: '📅' },
    WEEKLY: { label: 'Weekly', color: '#FF9800', icon: '📆' },
    SECTION: { label: 'Section', color: '#2196F3', icon: '📚' },
    ACHIEVEMENT: { label: 'Achievement', color: '#9C27B0', icon: '🏆' },
    GENERIC: { label: 'Challenge', color: '#607D8B', icon: '⭐' },
};
/** Get a human-readable label for quest progress status */
function getQuestStatusLabel(status) {
    switch (status) {
        case 'NOT_STARTED': return 'Not Started';
        case 'IN_PROGRESS': return 'In Progress';
        case 'COMPLETED': return 'Completed';
        case 'CLAIMED': return 'Claimed';
        case 'EXPIRED': return 'Expired';
        default: return status;
    }
}
