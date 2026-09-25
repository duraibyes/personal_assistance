/** Mirrors apps/web/src/lib/constants.ts so both clients write the same values. */
export const PAYMENT_METHODS = [
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_ACCOUNT', label: 'Bank Account' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'OTHER', label: 'Other' },
];

export const RECURRING_FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half-Yearly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom' },
];

export const LOAN_TYPES = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'HOME', label: 'Home' },
  { value: 'AUTO', label: 'Auto' },
  { value: 'EDUCATION', label: 'Education' },
];

export const LOAN_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'FORECLOSED', label: 'Foreclosed' },
];

export const CATEGORY_TYPES = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'BOTH', label: 'Both' },
];

export function labelFor(options: { value: string; label: string }[], value: string | null | undefined) {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
}

export const formatPaymentMethod = (value: string | null | undefined) => labelFor(PAYMENT_METHODS, value);

/** Prepends an "All" choice for filter chips. */
export const withAll = (options: { value: string; label: string }[], label = 'All') => [
  { value: '', label },
  ...options,
];
