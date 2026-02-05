import { ID, Query, Permission, Role } from 'react-native-appwrite';
import { databases } from './appwrite';
import { ENV } from '../config/environment';

const APPWRITE_DATABASE_ID = ENV.APPWRITE_DATABASE_ID;
import {
  SchoolCode,
  SchoolStudent,
  CodeValidationResult,
  EnrollmentResult,
  SchoolStudentStatus,
} from '../types/school';

// Collection IDs - Add these to your env.ts file
const SCHOOL_CODES_COLLECTION_ID = 'school_codes';
const SCHOOL_STUDENTS_COLLECTION_ID = 'school_students';
const SCHOOLS_COLLECTION_ID = 'schools';

/**
 * School Service for Mobile App
 * Handles school code validation and student enrollment
 */
class SchoolService {
  /**
   * Validate a school enrollment code
   * Checks if code exists, is active, has available seats, and isn't expired
   */
  async validateCode(code: string): Promise<CodeValidationResult> {
    try {
      // Normalize code (uppercase, trim)
      const normalizedCode = code.trim().toUpperCase();

      // Find the code in database
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        SCHOOL_CODES_COLLECTION_ID,
        [Query.equal('code', normalizedCode), Query.limit(1)]
      );

      if (response.documents.length === 0) {
        return {
          isValid: false,
          errorMessage: 'Invalid code. Please check and try again.',
        };
      }

      const schoolCode = response.documents[0] as unknown as SchoolCode;

      // Check if code is active
      if (schoolCode.status !== 'active') {
        const statusMessages: Record<string, string> = {
          expired: 'This code has expired. Please contact your school.',
          suspended: 'This code has been suspended. Please contact your school.',
          depleted: 'All seats for this code have been used. Please contact your school.',
        };
        return {
          isValid: false,
          errorMessage: statusMessages[schoolCode.status] || 'This code is not active.',
        };
      }

      // Check if seats are available
      if (schoolCode.seatsUsed >= schoolCode.seatsPurchased) {
        // Update status to depleted
        await this.updateCodeStatus(schoolCode.$id!, 'depleted');
        return {
          isValid: false,
          errorMessage: 'All seats for this code have been used. Please contact your school.',
        };
      }

      // Check if code is expired
      const now = new Date();
      const expirationDate = new Date(schoolCode.expirationDate);
      if (now > expirationDate) {
        // Update status to expired
        await this.updateCodeStatus(schoolCode.$id!, 'expired');
        return {
          isValid: false,
          errorMessage: 'This code has expired. Please contact your school.',
        };
      }

      // Get school info
      const school = await this.getSchoolById(schoolCode.schoolId);

      return {
        isValid: true,
        code: schoolCode,
        school: school || undefined,
      };
    } catch (error: any) {
      console.error('Code validation error:', error);
      return {
        isValid: false,
        errorMessage: 'Unable to validate code. Please try again.',
      };
    }
  }

  /**
   * Enroll a student using a school code
   * Creates enrollment record and increments seats used
   */
  async enrollStudent(
    userId: string,
    codeId: string,
    schoolId: string,
    expirationDate: string
  ): Promise<EnrollmentResult> {
    try {
      // Check if user is already enrolled
      const existingEnrollment = await this.getStudentEnrollment(userId);
      if (existingEnrollment) {
        // Check if existing enrollment is still active
        if (existingEnrollment.status === 'active') {
          const expiresAt = new Date(existingEnrollment.expiresAt);
          if (expiresAt > new Date()) {
            return {
              success: false,
              errorMessage: 'You are already enrolled with a school subscription.',
            };
          }
        }
      }

      const now = new Date().toISOString();

      // Create enrollment record
      const enrollment: Omit<SchoolStudent, '$id'> = {
        userId,
        schoolId,
        codeId,
        enrolledAt: now,
        expiresAt: expirationDate,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      const response = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        SCHOOL_STUDENTS_COLLECTION_ID,
        ID.unique(),
        enrollment,
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
        ]
      );

      // Increment seats used on the code
      await this.incrementSeatsUsed(codeId);

      return {
        success: true,
        enrollment: response as unknown as SchoolStudent,
      };
    } catch (error: any) {
      console.error('Student enrollment error:', error);
      return {
        success: false,
        errorMessage: error.message || 'Failed to enroll. Please try again.',
      };
    }
  }

  /**
   * Get student's current enrollment
   */
  async getStudentEnrollment(userId: string): Promise<SchoolStudent | null> {
    try {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        SCHOOL_STUDENTS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('createdAt'),
          Query.limit(1),
        ]
      );

      if (response.documents.length > 0) {
        return response.documents[0] as unknown as SchoolStudent;
      }

      return null;
    } catch (error: any) {
      console.error('Error getting student enrollment:', error);
      return null;
    }
  }

  /**
   * Check if student has active school subscription
   */
  async hasActiveSchoolSubscription(userId: string): Promise<{
    hasAccess: boolean;
    enrollment: SchoolStudent | null;
    daysRemaining: number;
  }> {
    try {
      const enrollment = await this.getStudentEnrollment(userId);

      if (!enrollment) {
        return { hasAccess: false, enrollment: null, daysRemaining: 0 };
      }

      // Check if enrollment is active
      if (enrollment.status !== 'active') {
        return { hasAccess: false, enrollment, daysRemaining: 0 };
      }

      // Check if not expired
      const now = new Date();
      const expiresAt = new Date(enrollment.expiresAt);
      
      if (now > expiresAt) {
        // Update status to expired
        await this.updateEnrollmentStatus(enrollment.$id!, 'expired');
        return { hasAccess: false, enrollment, daysRemaining: 0 };
      }

      // Calculate days remaining
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        hasAccess: true,
        enrollment,
        daysRemaining,
      };
    } catch (error: any) {
      console.error('Error checking school subscription:', error);
      return { hasAccess: false, enrollment: null, daysRemaining: 0 };
    }
  }

  /**
   * Get school by ID
   */
  private async getSchoolById(schoolId: string): Promise<any | null> {
    try {
      const response = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        SCHOOLS_COLLECTION_ID,
        schoolId
      );
      return response;
    } catch (error: any) {
      console.error('Error getting school:', error);
      return null;
    }
  }

  /**
   * Update code status
   */
  private async updateCodeStatus(
    codeId: string,
    status: string
  ): Promise<void> {
    try {
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        SCHOOL_CODES_COLLECTION_ID,
        codeId,
        {
          status,
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (error: any) {
      console.error('Error updating code status:', error);
    }
  }

  /**
   * Increment seats used on a code
   */
  private async incrementSeatsUsed(codeId: string): Promise<void> {
    try {
      // Get current code
      const code = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        SCHOOL_CODES_COLLECTION_ID,
        codeId
      );

      const currentSeatsUsed = (code as any).seatsUsed || 0;
      const seatsPurchased = (code as any).seatsPurchased || 0;
      const newSeatsUsed = currentSeatsUsed + 1;

      // Update seats used
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        SCHOOL_CODES_COLLECTION_ID,
        codeId,
        {
          seatsUsed: newSeatsUsed,
          status: newSeatsUsed >= seatsPurchased ? 'depleted' : 'active',
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (error: any) {
      console.error('Error incrementing seats used:', error);
    }
  }

  /**
   * Update enrollment status
   */
  private async updateEnrollmentStatus(
    enrollmentId: string,
    status: SchoolStudentStatus
  ): Promise<void> {
    try {
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        SCHOOL_STUDENTS_COLLECTION_ID,
        enrollmentId,
        {
          status,
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (error: any) {
      console.error('Error updating enrollment status:', error);
    }
  }

  /**
   * Get school code details (for displaying in app)
   */
  async getCodeDetails(codeId: string): Promise<SchoolCode | null> {
    try {
      const response = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        SCHOOL_CODES_COLLECTION_ID,
        codeId
      );
      return response as unknown as SchoolCode;
    } catch (error: any) {
      console.error('Error getting code details:', error);
      return null;
    }
  }
}

export const schoolService = new SchoolService();
export default schoolService;
