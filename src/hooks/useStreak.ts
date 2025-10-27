import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
    updateStreakOnLogin,
    loadStreakData,
    getStreakStats as getStreakStatsAction,
    getWeeklyStreak,
    checkTodayLogin,
} from '../store/slices/streakSlice';
import { AppDispatch } from '../store';

/**
 * Custom hook for managing streak functionality
 * Provides easy access to streak data and operations
 */
export const useStreak = (userId: string | null) => {
    const dispatch = useDispatch<AppDispatch>();

    const streakState = useSelector((state: RootState) => state.streak);

    const {
        currentStreak,
        longestStreak,
        weeklyStreak,
        totalStreak,
        streakStartDate,
        lastLoginDate,
        loginHistory,
        isLoading,
        error,
    } = streakState;

    /**
     * Load streak data for the user
     */
    const loadStreak = async () => {
        if (!userId) return;

        try {
            await dispatch(loadStreakData(userId)).unwrap();
        } catch (error) {
            console.error('Failed to load streak data:', error);
        }
    };

    /**
     * Update streak on user login
     * Call this when user successfully logs in or opens the app
     */
    const recordLogin = async () => {
        if (!userId) return;

        try {
            await dispatch(updateStreakOnLogin(userId)).unwrap();
        } catch (error) {
            console.error('Failed to update streak on login:', error);
        }
    };

    /**
     * Refresh streak statistics
     */
    const refreshStats = async () => {
        if (!userId) return;

        try {
            await dispatch(getStreakStatsAction(userId)).unwrap();
        } catch (error) {
            console.error('Failed to refresh streak stats:', error);
        }
    };

    /**
     * Get weekly streak data
     */
    const refreshWeeklyStreak = async () => {
        if (!userId) return;

        try {
            await dispatch(getWeeklyStreak(userId)).unwrap();
        } catch (error) {
            console.error('Failed to get weekly streak:', error);
        }
    };

    /**
     * Check if user has logged in today
     */
    const checkTodayLoginStatus = async () => {
        if (!userId) return false;

        try {
            const result = await dispatch(checkTodayLogin(userId)).unwrap();
            return result;
        } catch (error) {
            console.error('Failed to check today login:', error);
            return false;
        }
    };

    /**
     * Auto-load streak data when userId changes
     */
    useEffect(() => {
        if (userId) {
            loadStreak();
        }
    }, [userId]);

    /**
     * Calculate streak progress and statistics
     */
    const getStreakStats = () => {
        const streakPercentageOfBest = longestStreak > 0 ? (currentStreak / longestStreak) * 100 : 100;
        const weekProgress = (weeklyStreak / 7) * 100;

        // Calculate days since streak started
        let daysSinceStart = 0;
        if (streakStartDate) {
            const startDate = new Date(streakStartDate);
            const now = new Date();
            const diffTime = now.getTime() - startDate.getTime();
            daysSinceStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
            streakPercentageOfBest,
            weekProgress,
            daysSinceStart,
            isCurrentStreakBest: currentStreak === longestStreak && currentStreak > 0,
            isPerfectWeek: weeklyStreak === 7,
        };
    };

    /**
     * Get motivational messages based on streak data
     */
    const getMotivationalMessage = () => {
        const stats = getStreakStats();

        if (currentStreak === 0) {
            return "Start your learning journey today! 🚀";
        }

        if (currentStreak === 1) {
            return "Great start! Come back tomorrow to build your streak! 🔥";
        }

        if (stats.isCurrentStreakBest) {
            return `Amazing! You're on your best streak ever! Keep it up! 🏆`;
        }

        if (stats.isPerfectWeek) {
            return "Perfect week! You've logged in every day! 🌟";
        }

        if (weeklyStreak >= 5) {
            return "You're almost at a perfect week! 💪";
        }

        if (currentStreak >= 7) {
            return `Incredible ${currentStreak}-day streak! You're on fire! 🔥`;
        }

        if (currentStreak >= 3) {
            return `${currentStreak} days strong! Keep the momentum going! 💪`;
        }

        return `Day ${currentStreak} of your streak! Don't break the chain! ⛓️`;
    };

    /**
     * Get next milestone information
     */
    const getNextMilestone = () => {
        const milestones = [7, 14, 21, 30, 50, 100, 365];
        const nextMilestone = milestones.find(milestone => milestone > currentStreak);

        if (!nextMilestone) {
            return {
                target: null,
                daysToGo: 0,
                message: "You've reached all milestones! You're a legend! 🏆",
            };
        }

        const daysToGo = nextMilestone - currentStreak;
        let message = '';

        switch (nextMilestone) {
            case 7:
                message = "Reach a week-long streak!";
                break;
            case 14:
                message = "Build a two-week habit!";
                break;
            case 21:
                message = "Form a lasting habit!";
                break;
            case 30:
                message = "Complete a month of learning!";
                break;
            case 50:
                message = "Join the 50-day club!";
                break;
            case 100:
                message = "Become a centurion learner!";
                break;
            case 365:
                message = "Achieve the ultimate yearly streak!";
                break;
            default:
                message = `Reach ${nextMilestone} days!`;
        }

        return {
            target: nextMilestone,
            daysToGo,
            message,
        };
    };

    return {
        // Data
        currentStreak,
        longestStreak,
        weeklyStreak,
        totalStreak,
        streakStartDate,
        lastLoginDate,
        loginHistory,
        isLoading,
        error,

        // Actions
        loadStreak,
        recordLogin,
        refreshStats,
        refreshWeeklyStreak,
        checkTodayLoginStatus,

        // Calculated values
        stats: getStreakStats(),
        motivationalMessage: getMotivationalMessage(),
        nextMilestone: getNextMilestone(),

        // Utility functions
        getStreakStats,
        getMotivationalMessage,
        getNextMilestone,
    };
};