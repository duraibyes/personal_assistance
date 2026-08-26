export const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_ACCOUNT', label: 'Bank Account' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'OTHER', label: 'Other' },
]

export const RECURRING_FREQUENCY_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half-Yearly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom' },
]

export function formatPaymentMethod(value: string | null | undefined): string {
  if (!value) return '—'
  const match = PAYMENT_METHOD_OPTIONS.find((o) => o.value === value)
  return match ? match.label : value
}
