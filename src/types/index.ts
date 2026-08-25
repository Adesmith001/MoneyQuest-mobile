export interface User {
  hasCompletedTutorial: any;
  currentUser?: any;
  userDocument?: any;
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
  totalXP: number; // Total lifetime XP accumulated
  lastMonthlyReset?: string; // 'YYYY-MM' month key for the most recent monthly XP reset
  activeDays?: string;
  // Lives system (max 5, lose 1 on wrong answers, earn 1 on level completion)
  lives: number;
  lastLifeRegenTime: string; // ISO timestamp of last life regeneration
  // Account status
  accountStatus?: string; // 'active' | 'disabled'
  // Current progress tracking
  currentLevelId?: string; // UUID of current level from backend
  currentSectionId?: string; // UUID of current section from backend
  $createdAt: string;
  $updatedAt: string;
}

// Backend API Question format (from database)
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

// Generated Question format (from /generate-questions endpoint)
export interface GeneratedQuestion {
  question_id?: number | string; // Question ID from backend
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanations: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  difficulty: string;
  question_type?: 'mcq' | 'scenario' | 'matching' | 'fill_in_gap';
}

// Scenario Question (multiple-choice with context/story)
export interface ScenarioQuestion extends GeneratedQuestion {
  question_type: 'scenario';
  scenario_context: string; // The story/context for the question
}

// Matching Question (match items from two columns)
export interface MatchingQuestion {
  pair_id?: number | string; // Pair ID from backend
  question_type: 'matching';
  question: string;
  left_items: { id: string; text: string }[]; // Items to match from
  right_items: { id: string; text: string }[]; // Items to match to
  correct_matches: { [key: string]: string }; // Map of left_id -> right_id
  explanation: string;
  difficulty: string;
}

// Fill in the Gap Question
export interface FillInGapQuestion {
  question_id?: number | string; // Question ID from backend
  question_type: 'fill_in_gap';
  question: string; // Question text with blanks marked as {blank1}, {blank2}, etc.
  blanks: {
    id: string; // blank1, blank2, etc.
    correct_answer: string;
    options?: string[]; // Optional: provide options for each blank
  }[];
  explanation: string;
  difficulty: string;
}

// Union type for all question types
export type AnyQuestion = GeneratedQuestion | ScenarioQuestion | MatchingQuestion | FillInGapQuestion;

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
  avatar?: string;       
  profilePicture?: string; 
  monthlyXP: number;
  streak?: number;
  rank: number;
  month: string;
  year: number;
}

// Backend API Level format (from /levels endpoint)
export interface BackendLevel {
  level_id: string;
  level_number: number;
  title: string;
  description: string;
  content_type?: string;
  has_quiz: boolean;
  min_score_to_pass: number;
  estimated_time_minutes: number;
  section_id?: string;
  difficulty?: number;
}

// Backend API Section format (from /upload/list endpoint - these are documents)
export interface BackendSection {
  document_id: string;
  title: string;
  category?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  section_id?: string;
  image_url?: string;
}

export interface BackendLevelDetail {
  level: BackendLevel;
  section: {
    section_id: string;
    title: string;
  };
}

export interface BackendQuestionResponse {
  level_id: string;
  level_title: string;
  section_title: string;
  questions: GeneratedQuestion[];
  total_generated: number;
  sources_used: string[];
}

// Recap Section Types
export interface RecapQuestion {
  // Common fields for all question types
  question_type: 'quiz' | 'scenario' | 'matching';
  source_level_id: string;
  source_level_title: string;
  
  // Quiz/Scenario question fields
  question_id?: number;
  question_text?: string;
  scenario?: string; // For scenario questions
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: 'A' | 'B' | 'C' | 'D';
  explanation_a?: string;
  explanation_b?: string;
  explanation_c?: string;
  explanation_d?: string;
  difficulty?: string;
  
  // Matching question fields
  pair_id?: number;
  level_id?: string;
  column_a?: string;
  column_b?: string;
  created_at?: string;
}

export interface RecapSourceSection {
  section_number: number;
  section_id: string;
  section_title: string;
  questions_by_type: {
    quiz: RecapQuestion[];
    scenario: RecapQuestion[];
    matching: RecapQuestion[];
  };
  question_count: number;
}

export interface RecapSectionResponse {
  recap_section_id: string;
  recap_section_number: number;
  recap_section_title: string;
  recap_section_description: string;
  source_sections: RecapSourceSection[];
  total_questions: number;
  randomized: boolean;
  limit_per_section: number;
  source_section_range: string;
}

export interface BackendSubmitLevelResponse {
  passed: boolean;
  score: number;
  next_level_unlocked: boolean;
  next_level_id: string | null;
  message: string;
  /** Gamification result bundle from backend — contains streak, badges, quests, rewards, chests */
  gamification?: import('./gamification').GamificationResultBundle;
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

// Document Management Types
export interface BackendDocument {
  document_id: string;
  title: string;
  description?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
  sections?: BackendDocumentSection[];
}

export interface BackendDocumentSection {
  section_id: string;
  section_number: number;
  title: string;
  description?: string;
}

export interface BackendDocumentList {
  documents: BackendDocument[];
  total: number;
}

export interface BackendUploadResult {
  message: string;
  total_files: number;
  total_size: number;
  uploads: BackendUploadDetail[];
}

export interface BackendUploadDetail {
  id: string;
  filename: string;
  sanitized_filename: string;
  file_type: string;
  file_size: number;
  file_hash: string;
  status: string;
  message: string;
  category: string;
}

export interface BackendStats {
  database_stats: {
    total_documents: number;
    total_sections: number;
    total_levels: number;
  };
  file_stats: {
    total_files: number;
    total_size_mb: number;
  };
}

// Audio Service Types
export interface BackendTranscriptionRequest {
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'vtt' | 'verbose_json';
  temperature?: number;
}

export interface BackendTranscriptionResponse {
  success: boolean;
  text?: string;
  transcription?: any;
  error?: string;
  duration?: number;
  language?: string;
}

export interface BackendTTSStreamRequest {
  text: string;
  voice?: string;
  output_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';
  speed?: number;
}

export interface BackendTTSJsonResponse {
  success: boolean;
  audio_base64?: string;
  voice?: string;
  model?: string;
  text_length?: number;
  output_format?: string;
  error?: string;
}

// Section with levels list
export interface BackendSectionWithLevels {
  section_id: string;
  levels: BackendLevel[];
}

export interface BackendSectionList {
  count: number;
  sections: BackendSection[];
}

export interface BackendContentVersionResponse {
  version: string;
  updated_at?: string;
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
  isLoggingOut: boolean;
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
