// School Dashboard Types

export type SchoolStatus = 'active' | 'suspended' | 'pending';
export type SchoolCodeStatus = 'active' | 'expired' | 'suspended' | 'depleted';
export type SchoolStudentStatus = 'active' | 'expired' | 'revoked';
export type SchoolPaymentStatus = 'pending' | 'success' | 'failed';
export type SchoolPlanType = 'monthly' | 'annual';

export interface School {
  $id: string;
  name: string;
  email: string;
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

export interface SchoolCode {
  $id: string;
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

export interface SchoolStudent {
  $id: string;
  userId: string;
  schoolId: string;
  codeId: string;
  enrolledAt: string;
  expiresAt: string;
  status: SchoolStudentStatus;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  code?: SchoolCode;
}

export interface SchoolPayment {
  $id: string;
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

export interface DashboardStats {
  totalCodes: number;
  activeCodes: number;
  totalSeatsPurchased: number;
  seatsUsed: number;
  seatsAvailable: number;
  totalStudents: number;
  activeStudents: number;
  totalSpent: number;
}

export interface PricingTier {
  minSeats: number;
  maxSeats: number;
  discountPercent: number;
}

export interface PriceCalculation {
  totalPrice: number;
  pricePerSeat: number;
  discountPercent: number;
  savings: number;
}
