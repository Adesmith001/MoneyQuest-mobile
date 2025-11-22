export interface User {
  $id: string;
  userId?: string;
  email: string;
  name: string;
  username?: string;
  phoneNumber?: string;
  profilePicture?: string;
  profilePictureId?: string;
  age?: number;
  learningLimit?: string;
  mainGoal?: string;
  referralSource?: string;
  avatar?: string;
  xp: number;
  level: number;
  currentSection: number;
  streak: number;
  lastLoginDate: string;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  monthlyXP: number;
  totalXP: number; // Total XP accumulated (resets monthly like monthlyXP)
  activeDays?: string;
  // Lives system (max 5, regenerates 1 per hour)
  lives: number;
  lastLifeRegenTime: string; // ISO timestamp of last life regeneration
  // Current progress tracking
  currentLevelId?: string; // UUID of current level from backend
  currentSectionId?: string; // UUID of current section from backend
  $createdAt: string;
  $updatedAt: string;
}

// Backend API Question format
export interface BackendQuestion {
  question_id: number;
  level_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation_a: string;
  explanation_b: string;
  explanation_c: string;
  explanation_d: string;
  difficulty?: string;
  created_at?: string;
}

// Legacy Appwrite Question format (kept for backwards compatibility)
export interface Question {
  $id: string;
  level: number;
  section: number;
  questionText: string;
  audioUrl?: string;
  options: string[];
  correctAnswer: string;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  createdAt: string;
  explanation?: string; // Explanation for the correct answer
}

// Backend API UserProgress format
export interface BackendUserProgress {
  user_id: string;
  level_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score: number;
  attempts: number;
  time_spent_minutes: number;
  completed_at?: string;
}

// Legacy Appwrite UserProgress format
export interface UserProgress {
  $id: string;
  userId: string;
  level: number;
  section: number;
  questionsAnswered: number;
  questionsCorrect: number;
  xpEarned: number;
  completedAt?: string;
  isCompleted: boolean;
}

export interface LeaderboardEntry {
  $id: string;
  userId: string;
  userName: string;
  profilePicture?: string;
  monthlyXP: number;
  rank: number;
  month: string;
  year: number;
}

// Backend API Types
// Backend API Level format (from /levels endpoint)
export interface BackendLevel {
  level_id: string;
  title: string;
  section_id: string;
  difficulty: number;
}

// Backend API Section format (from /upload/list endpoint - these are documents)
export interface BackendSection {
  document_id: string;
  title: string;
  category?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BackendLevelDetail {
  level: BackendLevel;
  section: BackendSection;
}

export interface BackendQuestionResponse {
  level_id: string;
  level_title: string;
  section_title: string;
  questions: BackendQuestion[];
  total_generated: number;
  sources_used: string[];
}

export interface BackendSubmitLevelResponse {
  passed: boolean;
  score: number;
  next_level_unlocked: boolean;
  next_level_id: string | null;
  message: string;
}

export interface BackendTTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface BackendTTSResponse {
  audio_url: string;
  duration_seconds: number;
  message: string;
}

// Legacy types
export interface Level {
  $id: string;
  levelNumber: number;
  title: string;
  description: string;
  sections: Section[];
  minXPRequired: number;
  isUnlocked: boolean;
}

export interface Section {
  id: number;
  title: string;
  description: string;
  questionCount: number;
  xpReward: number;
  isCompleted: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  showWelcomeScreen: boolean;
}

export interface GameState {
  currentLevel: number;
  currentSection: number;
  currentQuestion: number;
  progress: number;
  xp: number;
  streak: number;
  isQuestionActive: boolean;
  questionProgress: number;
  health: number;
}

export interface QuestionAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  xpEarned: number;
}