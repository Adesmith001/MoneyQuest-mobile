// School Subscription Types

export type SchoolStatus = 'active' | 'suspended' | 'pending';
export type SchoolCodeStatus = 'active' | 'expired' | 'suspended' | 'depleted';
export type SchoolStudentStatus = 'active' | 'expired' | 'revoked';
export type SchoolPaymentStatus = 'pending' | 'success' | 'failed';
export type SchoolPlanType = 'monthly' | 'annual';

/**
 * School entity - represents a registered school
 */
export interface School {
  $id?: string;
  name: string;
  email: string;
  passwordHash?: string; // Only used server-side
  contactPerson: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  logo?: string;
  status: SchoolStatus;
  totalSeatsEverPurchased: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * School login/registration data
 */
export interface SchoolAuthData {
  email: string;
  password: string;
}

export interface SchoolRegistrationData {
  name: string;
  email: string;
  password: string;
  contactPerson: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * School Code - enrollment code for students
 */
export interface SchoolCode {
  $id?: string;
  schoolId: string;
  code: string;
  name: string;
  seatsPurchased: number;
  seatsUsed: number;
  planType: SchoolPlanType;
  status: SchoolCodeStatus;
  expirationDate: string;
  activationDate: string;
  paymentReference?: string;
  amount: number;
  pricePerSeat: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * School Student - links a student to a school code
 */
export interface SchoolStudent {
  $id?: string;
  userId: string;
  schoolId: string;
  codeId: string;
  enrolledAt: string;
  expiresAt: string;
  status: SchoolStudentStatus;
  createdAt: string;
  updatedAt: string;
  // Populated fields (joined)
  school?: School;
  code?: SchoolCode;
}

/**
 * School Payment - payment audit trail
 */
export interface SchoolPayment {
  $id?: string;
  schoolId: string;
  codeId?: string;
  transactionReference: string;
  amount: number;
  currency: string;
  seats: number;
  planType: SchoolPlanType;
  status: SchoolPaymentStatus;
  paymentMethod?: string;
  paidAt?: string;
  createdAt: string;
}

/**
 * Pricing configuration for school seats
 */
export interface SchoolPricingTier {
  minSeats: number;
  maxSeats: number;
  discountPercent: number;
}

export interface SchoolPlanPricing {
  id: SchoolPlanType;
  name: string;
  pricePerSeat: number;
  currency: string;
  duration: string;
  billingCycle: 'month' | 'year';
  minSeats: number;
}

/**
 * School subscription plans configuration
 */
export const SCHOOL_PRICING: Record<SchoolPlanType, SchoolPlanPricing> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    pricePerSeat: 2000, // ₦3,000 per seat per month
    currency: 'NGN',
    duration: 'Month',
    billingCycle: 'month',
    minSeats: 1,
  },
  annual: {
    id: 'annual',
    name: 'Annual',
    pricePerSeat: 24000, // ₦35,000 per seat per year
    currency: 'NGN',
    duration: 'Year',
    billingCycle: 'year',
    minSeats: 1,
  },
};

/**
 * Calculate price for school seats (no discounts)
 */
export function calculateSchoolPrice(
  planType: SchoolPlanType,
  seats: number
): { totalPrice: number; pricePerSeat: number; discountPercent: number } {
  const plan = SCHOOL_PRICING[planType];
  const pricePerSeat = plan.pricePerSeat;
  const totalPrice = pricePerSeat * seats;

  return {
    totalPrice,
    pricePerSeat,
    discountPercent: 0,
  };
}

/**
 * Code validation result
 */
export interface CodeValidationResult {
  isValid: boolean;
  code?: SchoolCode;
  school?: School;
  errorMessage?: string;
}

/**
 * Student enrollment result
 */
export interface EnrollmentResult {
  success: boolean;
  enrollment?: SchoolStudent;
  errorMessage?: string;
}

/**
 * Dashboard statistics for schools
 */
export interface SchoolDashboardStats {
  totalCodes: number;
  activeCodes: number;
  totalSeatsPurchased: number;
  seatsUsed: number;
  seatsAvailable: number;
  totalStudents: number;
  activeStudents: number;
  totalSpent: number;
}
