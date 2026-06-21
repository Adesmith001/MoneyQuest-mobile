"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateQuizAccuracy = exports.normalizeSavedQuizProgress = void 0;
const toSafeNumber = (value) => {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
};
const normalizeSavedQuizProgress = (source) => {
    const currentQuestionIndex = toSafeNumber(source.currentQuestionIndex);
    const questionsCorrect = toSafeNumber(source.questionsCorrect);
    const xpEarned = toSafeNumber(source.xpEarned);
    const fallbackAttempts = Math.max(questionsCorrect, currentQuestionIndex);
    const totalAttempts = Math.max(toSafeNumber(source.attempts), fallbackAttempts);
    return {
        currentQuestionIndex,
        questionsCorrect,
        xpEarned,
        totalAttempts,
    };
};
exports.normalizeSavedQuizProgress = normalizeSavedQuizProgress;
const calculateQuizAccuracy = (questionsCorrect, totalAttempts) => {
    const safeCorrect = Math.max(0, Number.isFinite(questionsCorrect) ? questionsCorrect : 0);
    const safeAttempts = Math.max(0, Number.isFinite(totalAttempts) ? totalAttempts : 0);
    if (safeAttempts === 0) {
        return 0;
    }
    return Math.min(100, Math.round((safeCorrect / safeAttempts) * 100));
};
exports.calculateQuizAccuracy = calculateQuizAccuracy;
