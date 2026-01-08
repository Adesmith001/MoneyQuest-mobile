import { databases, account, ID, Query } from '../lib/appwrite';
import { config, SCHOOL_PRICING, SchoolPlanType } from '../config';
import { SchoolCode, SchoolPayment, DashboardStats, SchoolStudent, School } from '../types';
import { generateSchoolCode, calculatePrice } from '../lib/utils';

// Schools API
export const schoolsApi = {
  // Update school profile
  async update(schoolId: string, data: Partial<Pick<School, 'name' | 'contactPerson' | 'phone' | 'address'>>): Promise<School> {
    const response = await databases.updateDocument(
      config.appwrite.databaseId,
      config.collections.schools,
      schoolId,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      }
    );
    return response as unknown as School;
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await account.updatePassword(newPassword, currentPassword);
  },
};

// School Codes API
export const codesApi = {
  // Get all codes for a school
  async getAll(schoolId: string): Promise<SchoolCode[]> {
    console.log('Fetching codes for schoolId:', schoolId);
    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      config.collections.schoolCodes,
      [
        Query.equal('schoolId', schoolId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]
    );
    console.log('Found codes:', response.documents);
    return response.documents as unknown as SchoolCode[];
  },

  // Get a single code
  async getById(codeId: string): Promise<SchoolCode> {
    const response = await databases.getDocument(
      config.appwrite.databaseId,
      config.collections.schoolCodes,
      codeId
    );
    return response as unknown as SchoolCode;
  },

  // Create a new code after payment
  async create(
    schoolId: string,
    name: string,
    seats: number,
    planType: SchoolPlanType,
    paymentReference: string
  ): Promise<SchoolCode> {
    // Check if a code with this payment reference already exists (prevent duplicates)
    const existingCodes = await databases.listDocuments(
      config.appwrite.databaseId,
      config.collections.schoolCodes,
      [Query.equal('paymentReference', paymentReference), Query.limit(1)]
    );

    if (existingCodes.documents.length > 0) {
      console.log('Code already exists for this payment reference:', paymentReference);
      return existingCodes.documents[0] as unknown as SchoolCode;
    }

    const now = new Date();
    const expirationDate = new Date(now);
    
    // Set expiration based on plan type
    if (planType === 'annual') {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    } else {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    }

    const pricing = calculatePrice(planType, seats);
    const code = generateSchoolCode();

    // Only include fields that exist in your Appwrite collection
    const codeData = {
      schoolId,
      code,
      name,
      seatsPurchased: seats,
      seatsUsed: 0,
      planType,
      status: 'active',
      expirationDate: expirationDate.toISOString(),
      activationDate: now.toISOString(),
      paymentReference,
      amount: pricing.totalPrice,
      pricePerSeat: pricing.pricePerSeat,
      currency: 'NGN',
    };

    console.log('Creating code with data:', codeData);

    const response = await databases.createDocument(
      config.appwrite.databaseId,
      config.collections.schoolCodes,
      ID.unique(),
      codeData
    );

    return response as unknown as SchoolCode;
  },

  // Update a code
  async update(codeId: string, data: Partial<SchoolCode>): Promise<SchoolCode> {
    const response = await databases.updateDocument(
      config.appwrite.databaseId,
      config.collections.schoolCodes,
      codeId,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      }
    );
    return response as unknown as SchoolCode;
  },

  // Suspend/Activate a code
  async toggleStatus(codeId: string, status: 'active' | 'suspended'): Promise<SchoolCode> {
    return this.update(codeId, { status });
  },

  // Regenerate code
  async regenerateCode(codeId: string): Promise<SchoolCode> {
    const newCode = generateSchoolCode();
    return this.update(codeId, { code: newCode });
  },
};

// Students API
export const studentsApi = {
  // Get all students for a school
  async getAll(schoolId: string): Promise<SchoolStudent[]> {
    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      config.collections.schoolStudents,
      [
        Query.equal('schoolId', schoolId),
        Query.orderDesc('enrolledAt'),
        Query.limit(500),
      ]
    );
    return response.documents as unknown as SchoolStudent[];
  },

  // Get students for a specific code
  async getByCode(codeId: string): Promise<SchoolStudent[]> {
    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      config.collections.schoolStudents,
      [
        Query.equal('codeId', codeId),
        Query.orderDesc('enrolledAt'),
      ]
    );
    return response.documents as unknown as SchoolStudent[];
  },

  // Revoke student access
  async revoke(studentId: string, codeId: string): Promise<void> {
    // Update student status
    await databases.updateDocument(
      config.appwrite.databaseId,
      config.collections.schoolStudents,
      studentId,
      {
        status: 'revoked',
        updatedAt: new Date().toISOString(),
      }
    );

    // Decrement seats used on the code
    const code = await codesApi.getById(codeId);
    await codesApi.update(codeId, {
      seatsUsed: Math.max(0, code.seatsUsed - 1),
      status: code.status === 'depleted' ? 'active' : code.status,
    });
  },
};

// Payments API
export const paymentsApi = {
  // Get all payments for a school
  async getAll(schoolId: string): Promise<SchoolPayment[]> {
    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      config.collections.schoolPayments,
      [
        Query.equal('schoolId', schoolId),
        Query.orderDesc('createdAt'),
        Query.limit(100),
      ]
    );
    return response.documents as unknown as SchoolPayment[];
  },

  // Create a pending payment record
  async createPending(
    schoolId: string,
    seats: number,
    planType: SchoolPlanType,
    transactionReference: string
  ): Promise<SchoolPayment> {
    const pricing = calculatePrice(planType, seats);

    const paymentData = {
      schoolId,
      transactionReference,
      amount: pricing.totalPrice,
      currency: 'NGN',
      seats,
      planType,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      config.appwrite.databaseId,
      config.collections.schoolPayments,
      ID.unique(),
      paymentData
    );

    return response as unknown as SchoolPayment;
  },

  // Update payment status by document ID
  async updateStatusById(
    paymentId: string,
    status: 'success' | 'failed',
    paymentMethod?: string
  ): Promise<SchoolPayment> {
    const response = await databases.updateDocument(
      config.appwrite.databaseId,
      config.collections.schoolPayments,
      paymentId,
      {
        status,
        paymentMethod,
        paidAt: status === 'success' ? new Date().toISOString() : undefined,
      }
    );
    return response as unknown as SchoolPayment;
  },

  // Update payment status by transaction reference
  async updateStatus(
    transactionReference: string,
    status: 'success' | 'failed',
    paymentMethod?: string
  ): Promise<SchoolPayment | null> {
    // First, find the payment by reference
    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      config.collections.schoolPayments,
      [
        Query.equal('transactionReference', transactionReference),
        Query.limit(1),
      ]
    );

    if (response.documents.length === 0) {
      console.error('Payment not found for reference:', transactionReference);
      return null;
    }

    const payment = response.documents[0];
    return this.updateStatusById(payment.$id, status, paymentMethod);
  },
};

// Dashboard Stats API
export const statsApi = {
  async get(schoolId: string): Promise<DashboardStats> {
    // Fetch all codes
    const codes = await codesApi.getAll(schoolId);
    
    // Fetch all students
    const students = await studentsApi.getAll(schoolId);
    
    // Fetch all payments
    const payments = await paymentsApi.getAll(schoolId);

    // Calculate stats
    const totalCodes = codes.length;
    const activeCodes = codes.filter(c => c.status === 'active').length;
    const totalSeatsPurchased = codes.reduce((sum, c) => sum + c.seatsPurchased, 0);
    const seatsUsed = codes.reduce((sum, c) => sum + c.seatsUsed, 0);
    const seatsAvailable = totalSeatsPurchased - seatsUsed;
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    const totalSpent = payments
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalCodes,
      activeCodes,
      totalSeatsPurchased,
      seatsUsed,
      seatsAvailable,
      totalStudents,
      activeStudents,
      totalSpent,
    };
  },
};
