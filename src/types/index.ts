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
  activeDays?:string;
  $createdAt: string;  
  $updatedAt: string;
}

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
}

export interface QuestionAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  xpEarned: number;
}