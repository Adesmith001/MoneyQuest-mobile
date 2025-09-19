import { databases, DB_ID, COLLECTIONS, Query } from './appwrite';
import { Question, UserProgress } from '../types';
import { AI_CONFIG } from '../config/appwrite';

class QuestionService {
  // Get questions for a specific level and section
  async getQuestions(level: number, section: number): Promise<Question[]> {
    try {
      const response = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.QUESTIONS,
        [
          Query.equal('level', level),
          Query.equal('section', section),
          Query.orderAsc('$createdAt')
        ]
      );

      // Type-safe conversion from Appwrite documents to Question interfaces
      const questions: Question[] = response.documents.map((doc: any) => ({
        $id: doc.$id,
        level: doc.level,
        section: doc.section,
        questionText: doc.questionText,
        audioUrl: doc.audioUrl,
        options: doc.options,
        correctAnswer: doc.correctAnswer,
        xpReward: doc.xpReward,
        difficulty: doc.difficulty,
        topic: doc.topic,
        createdAt: doc.createdAt || doc.$createdAt,
      }));

      return questions;
    } catch (error) {
      console.error('Get questions error:', error);
      throw error;
    }
  }

  // Get a single question by ID
  async getQuestion(questionId: string): Promise<Question | null> {
    try {
      const doc = await databases.getDocument(DB_ID, COLLECTIONS.QUESTIONS, questionId);
      
      // Type-safe conversion
      const question: Question = {
        $id: doc.$id,
        level: doc.level,
        section: doc.section,
        questionText: doc.questionText,
        audioUrl: doc.audioUrl,
        options: doc.options,
        correctAnswer: doc.correctAnswer,
        xpReward: doc.xpReward,
        difficulty: doc.difficulty,
        topic: doc.topic,
        createdAt: doc.createdAt || doc.$createdAt,
      };
      
      return question;
    } catch (error) {
      console.error('Get question error:', error);
      return null;
    }
  }

  // Record user's answer
  async recordAnswer(
    userId: string,
    questionId: string,
    selectedAnswer: string,
    isCorrect: boolean,
    timeSpent: number,
    xpEarned: number
  ): Promise<void> {
    try {
      // Update user stats
      const user = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      const newTotalQuestions = (user.totalQuestionsAnswered || 0) + 1;
      const newCorrectAnswers = (user.correctAnswers || 0) + (isCorrect ? 1 : 0);
      const newXP = (user.xp || 0) + xpEarned;
      const newMonthlyXP = (user.monthlyXP || 0) + xpEarned;

      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        totalQuestionsAnswered: newTotalQuestions,
        correctAnswers: newCorrectAnswers,
        xp: newXP,
        monthlyXP: newMonthlyXP,
        updatedAt: new Date().toISOString(),
      });

      // TODO: Record individual answer for analytics
      // You might want to create a separate collection for answer history
    } catch (error) {
      console.error('Record answer error:', error);
      throw error;
    }
  }

  // Get or create user progress for a level/section
  async getUserProgress(userId: string, level: number, section: number): Promise<UserProgress | null> {
    try {
      const response = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.USER_PROGRESS,
        [
          Query.equal('userId', userId),
          Query.equal('level', level),
          Query.equal('section', section)
        ]
      );

      if (response.documents.length > 0) {
        const doc = response.documents[0];
        
        // Type-safe conversion
        const userProgress: UserProgress = {
          $id: doc.$id,
          userId: doc.userId,
          level: doc.level,
          section: doc.section,
          questionsAnswered: doc.questionsAnswered,
          questionsCorrect: doc.questionsCorrect,
          xpEarned: doc.xpEarned,
          completedAt: doc.completedAt,
          isCompleted: doc.isCompleted,
        };
        
        return userProgress;
      } else {
        // Create new progress entry
        const newDoc = await databases.createDocument(
          DB_ID,
          COLLECTIONS.USER_PROGRESS,
          'unique()',
          {
            userId,
            level,
            section,
            questionsAnswered: 0,
            questionsCorrect: 0,
            xpEarned: 0,
            isCompleted: false,
          }
        );
        
        // Type-safe conversion for new document
        const newProgress: UserProgress = {
          $id: newDoc.$id,
          userId: newDoc.userId,
          level: newDoc.level,
          section: newDoc.section,
          questionsAnswered: newDoc.questionsAnswered,
          questionsCorrect: newDoc.questionsCorrect,
          xpEarned: newDoc.xpEarned,
          completedAt: newDoc.completedAt,
          isCompleted: newDoc.isCompleted,
        };
        
        return newProgress;
      }
    } catch (error) {
      console.error('Get user progress error:', error);
      return null;
    }
  }

  // Update user progress
  async updateUserProgress(
    userId: string,
    level: number,
    section: number,
    questionsAnswered: number,
    questionsCorrect: number,
    xpEarned: number,
    isCompleted: boolean = false
  ): Promise<void> {
    try {
      const progress = await this.getUserProgress(userId, level, section);
      if (progress) {
        await databases.updateDocument(
          DB_ID,
          COLLECTIONS.USER_PROGRESS,
          progress.$id,
          {
            questionsAnswered,
            questionsCorrect,
            xpEarned,
            isCompleted,
            completedAt: isCompleted ? new Date().toISOString() : undefined,
          }
        );
      }
    } catch (error) {
      console.error('Update user progress error:', error);
      throw error;
    }
  }

  // Check if user can access a level/section
  async canAccessLevel(userId: string, level: number, section: number = 1): Promise<boolean> {
    try {
      // Level 1, Section 1 is always accessible
      if (level === 1 && section === 1) {
        return true;
      }

      if (section > 1) {
        // Check if previous section is completed
        const prevSectionProgress = await this.getUserProgress(userId, level, section - 1);
        return prevSectionProgress?.isCompleted || false;
      } else {
        // Check if previous level is completed (all sections)
        // This is a simplified check - you might want to implement more complex logic
        const prevLevelProgress = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.USER_PROGRESS,
          [
            Query.equal('userId', userId),
            Query.equal('level', level - 1),
            Query.equal('isCompleted', true)
          ]
        );

        // Assuming each level has a fixed number of sections
        return prevLevelProgress.documents.length >= 4; // Adjust based on your level structure
      }
    } catch (error) {
      console.error('Can access level error:', error);
      return false;
    }
  }

  // Generate AI questions using OpenAI
  async generateAIQuestion(level: number, section: number, topic: string): Promise<Question | null> {
    try {
      // 1. Construct the prompt for the AI
      const prompt = `
        Generate a unique multiple-choice question for a financial education app.
        The user is on level ${level}, section ${section}.
        The topic is: "${topic}".
        
        The response must be a valid JSON object with the following structure and nothing else:
        {
          "questionText": "The question text...",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "The correct option text",
          "difficulty": "easy" | "medium" | "hard",
          "explanation": "A brief explanation of why the answer is correct."
        }
        
        Ensure the 'correctAnswer' value is one of the strings from the 'options' array.
        Do not include any text or formatting outside of the JSON object.
      `;

      // 2. Make the API call to OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.OPENAI_API_KEY}`, // Now using environment variable
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: "json_object" }, // Enforce JSON output
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('OpenAI API error:', response.status, errorBody);
        throw new Error(`OpenAI API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = JSON.parse(data.choices[0].message.content);

      // 3. Create the Question object from the AI response
      const newQuestion: Question = {
        $id: `ai_${Date.now()}`, // Temporary ID
        level,
        section,
        questionText: aiResponse.questionText,
        options: aiResponse.options,
        correctAnswer: aiResponse.correctAnswer,
        xpReward: 10, // You can adjust this based on difficulty
        difficulty: aiResponse.difficulty,
        topic,
        createdAt: new Date().toISOString(),
        explanation: aiResponse.explanation, // Add explanation field to your type
      };

      // 4. (Recommended) Save the generated question to your Appwrite database
      // This prevents generating the same question and saves API costs.
      // await databases.createDocument(DB_ID, COLLECTIONS.QUESTIONS, ID.unique(), newQuestion);

      return newQuestion;

    } catch (error) {
      console.error('Generate AI question error:', error);
      return null; // Return null on error
    }
  }
}

export default new QuestionService();