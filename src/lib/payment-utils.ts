import { addDays } from 'date-fns';

/**
 * Calculates the expected payment date based on the payment time selection
 */
export function calculateExpectedPaymentDate(paymentTime: string): Date {
  const now = new Date();
  
  switch (paymentTime) {
    case 'Instant':
      return now;
    case '1 day':
      return addDays(now, 1);
    case '1-2 days':
      return addDays(now, 2);
    case '2-3 days':
      return addDays(now, 3);
    case '3-5 days':
      return addDays(now, 5);
    case '5-10 days':
      return addDays(now, 10);
    default:
      // If a numeric string, try to parse it
      const days = parseInt(paymentTime);
      if (!isNaN(days)) {
        return addDays(now, days);
      }
      return now;
  }
}

/**
 * Sort payments by paid status, with unpaid payments first
 */
export function sortPaymentsByPaidStatus<T extends { paid: boolean }>(payments: T[]): T[] {
  return [...payments].sort((a, b) => {
    if (a.paid === b.paid) return 0;
    return a.paid ? 1 : -1;
  });
}

/**
 * Sort payments by due date (upcoming first)
 */
export function sortPaymentsByDueDate<T extends { paid?: boolean; dueDate?: string }>(payments: T[]): T[] {
  return [...payments].sort((a, b) => {
    // If payment is already paid, move to the end
    if (a.paid && !b.paid) return 1;
    if (!a.paid && b.paid) return -1;
    
    // Sort unpaid payments by due date (ascending)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    return 0;
  });
}

/**
 * Returns the minimum and maximum payment durations in days
 */
export function getPaymentDurationRange(): { min: number; max: number } {
  return {
    min: 0,  // Instant
    max: 10, // 5-10 days
  };
}

/**
 * Get the available payment duration options
 */
export function getPaymentDurationOptions(): string[] {
  return [
    'Instant',
    '1 day',
    '1-2 days',
    '2-3 days',
    '3-5 days',
    '5-10 days'
  ];
} 