import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SCHOOL_PRICING, SchoolPlanType } from '../config';
import { PriceCalculation } from '../types';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format date with time
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Generate school code
export function generateSchoolCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'MQ-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Calculate price (no discounts)
export function calculatePrice(planType: SchoolPlanType, seats: number): PriceCalculation {
  const plan = SCHOOL_PRICING[planType];
  const pricePerSeat = plan.pricePerSeat;
  const totalPrice = pricePerSeat * seats;

  return {
    totalPrice,
    pricePerSeat,
    discountPercent: 0,
    savings: 0,
  };
}

// Get days remaining until a date
export function getDaysRemaining(dateString: string): number {
  const now = new Date();
  const target = new Date(dateString);
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Get status color classes
export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'expired':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'suspended':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'depleted':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'pending':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'success':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'failed':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'revoked':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}
