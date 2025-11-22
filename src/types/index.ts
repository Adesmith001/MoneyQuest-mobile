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