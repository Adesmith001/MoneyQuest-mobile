export const config = {
  appwrite: {
    endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID || 'your-project-id',
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || 'your-database-id',
  },
  collections: {
    schools: 'schools',
    schoolCodes: 'school_codes',
    schoolStudents: 'school_students',
    schoolPayments: 'school_payments',
    users: 'users', // MoneyQuest users collection
  },
  korapay: {
    publicKey: import.meta.env.VITE_KORAPAY_PUBLIC_KEY || '',
    apiUrl: import.meta.env.VITE_KORAPAY_API_URL || 'https://api.korapay.com/merchant/api/v1',
  },
};

// School pricing configuration
export const SCHOOL_PRICING = {
  monthly: {
    id: 'monthly' as const,
    name: 'Monthly',
    pricePerSeat: 5000,
    fixedSeats: undefined as number | undefined,
    fixedPrice: undefined as number | undefined,
    currency: 'NGN',
    duration: 'Month',
    billingCycle: 'month' as const,
    minSeats: 1,
    isFixed: false,
  },
  annual: {
    id: 'annual' as const,
    name: 'Annual',
    pricePerSeat: 60000,
    fixedSeats: undefined as number | undefined,
    fixedPrice: undefined as number | undefined,
    currency: 'NGN',
    duration: 'Year',
    billingCycle: 'year' as const,
    minSeats: 1,
    isFixed: false,
  },
  school_monthly_100: {
    id: 'school_monthly_100' as const,
    name: 'School Plan (Monthly)',
    fixedSeats: 100,
    fixedPrice: 450000,
    pricePerSeat: 4500,
    currency: 'NGN',
    duration: 'Month',
    billingCycle: 'month' as const,
    minSeats: 100,
    isFixed: true,
  },
  school_annual_100: {
    id: 'school_annual_100' as const,
    name: 'School Plan (Annual)',
    fixedSeats: 100,
    fixedPrice: 5400000,
    pricePerSeat: 54000,
    currency: 'NGN',
    duration: 'Year',
    billingCycle: 'year' as const,
    minSeats: 100,
    isFixed: true,
  },
};

export type SchoolPlanType = keyof typeof SCHOOL_PRICING;
