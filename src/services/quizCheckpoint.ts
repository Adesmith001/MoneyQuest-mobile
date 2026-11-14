import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { databases, DB_ID, COLLECTIONS, Query } from './appwrite';

type Progress = {
  currentQuestionIndex: number;
  questionsAnswered: number;
  questionsCorrect: number;
  xpEarned: number;
};
type SavedAttempt = {
  id: string;
  checkpoint?: Progress & { attempts: number };
  submission?: {
    correct: number; total: number; minutes: number; xp: number; completionTime: string;
    lives?: number;
  };
};

const quizAttemptKey = (userId: string, levelId: string) => '@moneyquest_quiz:' + userId + ':' + levelId;

export async function readQuizAttempt(userId: string, levelId: string): Promise<SavedAttempt | null> {
  const saved = await AsyncStorage.getItem(quizAttemptKey(userId, levelId));
  if (!saved) return null;
  try {
    const attempt = JSON.parse(saved) as SavedAttempt;
    return typeof attempt?.id === 'string' ? attempt : null;
  } catch {
    return null;
  }
}

// Each quiz screen serializes its own writes; a completion and its pending checkpoints use the same document.
export class QuizCheckpoint {
  private pending = Promise.resolve();
  private closed = false;
  private localWrites = Promise.resolve();
  private documentId: Promise<string> | null = null;
  private attemptStart: Promise<SavedAttempt> | null = null;
  private uploadTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private userId: string, private levelId: string) {}

  private async findDocument() {
    const response = await databases.listDocuments(DB_ID, COLLECTIONS.USER_PROGRESS, [
      Query.equal('userId', this.userId), Query.equal('level', this.levelId), Query.limit(2),
    ]);
    const existing = response.documents.find(doc => doc.isCompleted) ?? response.documents[0];
    if (existing) return existing.$id;
    const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, this.userId + ':' + this.levelId);
    return 'progress-' + hash.slice(0, 26);
  }

  private write(progress: Progress, completedAt?: string) {
    const operation = this.pending.then(async () => {
      this.documentId ??= this.findDocument().catch(error => { this.documentId = null; throw error; });
      const id = await this.documentId;
      const fields = { ...progress, ...(completedAt ? { isCompleted: true, completedAt } : {}) };
      // A checkpoint updates only quiz position, so it cannot turn a completed row back into an incomplete one.
      try {
        await databases.updateDocument(DB_ID, COLLECTIONS.USER_PROGRESS, id, fields);
      } catch (error) {
        if ((error as { code?: number }).code !== 404) throw error;
        try {
          await databases.createDocument(DB_ID, COLLECTIONS.USER_PROGRESS, id, {
            userId: this.userId, level: this.levelId, section: 1, isCompleted: false, ...fields,
          });
        } catch (conflict) {
          if ((conflict as { code?: number }).code !== 409) throw conflict;
          await databases.updateDocument(DB_ID, COLLECTIONS.USER_PROGRESS, id, fields);
        }
      }
    });
    this.pending = operation.catch(() => {});
    return operation;
  }

  start() {
    if (!this.attemptStart) {
      this.attemptStart = (async () => {
        const saved = await readQuizAttempt(this.userId, this.levelId);
        if (saved) return saved;
        const attempt: SavedAttempt = { id: "mq2-" + randomUUID() };
        await this.persist(attempt);
        return attempt;
      })().finally(() => { this.attemptStart = null; });
    }
    return this.attemptStart;
  }

  persist(attempt: SavedAttempt) {
    const work = this.localWrites.then(async () => {
      const current = await readQuizAttempt(this.userId, this.levelId);
      if (current?.id === attempt.id && current.submission && !attempt.submission) return;
      await AsyncStorage.setItem(quizAttemptKey(this.userId, this.levelId), JSON.stringify(attempt));
    });
    this.localWrites = work.catch(() => {});
    return work;
  }

  async checkpoint(progress: Progress & { attempts: number }) {
    if (this.closed) return;
    const attempt = await this.start();
    if (this.closed || attempt.submission) return;
    await this.persist({ ...attempt, checkpoint: progress });
    const { attempts, ...fields } = progress;
    clearTimeout(this.uploadTimer);
    this.uploadTimer = setTimeout(() => {
      void this.write(fields).catch(() => {
        // The durable local checkpoint will be retried on the next save or resume.
      });
    }, 450);
  }

  complete(progress: Progress, completedAt: string) {
    clearTimeout(this.uploadTimer);
    return this.write(progress, completedAt);
  }

  clear() {
    this.closed = true;
    clearTimeout(this.uploadTimer);
    return this.localWrites.then(() => AsyncStorage.removeItem(quizAttemptKey(this.userId, this.levelId)));
  }
}
