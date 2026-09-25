/** What the AI returns for an EXPENSE document (see OcrService.ExpenseExtractionResult). */
export type ExpenseExtraction = {
  vendorName?: string;
  amount?: number;
  date?: string;
  category?: string;
  transactionId?: string;
  upiId?: string;
};

export const EXTRACTION_LABELS: Record<keyof ExpenseExtraction, string> = {
  vendorName: 'Vendor',
  amount: 'Amount',
  date: 'Date',
  category: 'Category',
  transactionId: 'Transaction ID',
  upiId: 'UPI ID',
};

/** The model returns a free-text category ("Food"); the form needs one of the user's category ids. */
export function matchCategoryId(
  categories: { id: string; name: string }[],
  label?: string
): string | undefined {
  const needle = label?.trim().toLowerCase();
  if (!needle) return undefined;
  const exact = categories.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact.id;
  return categories.find(
    (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase())
  )?.id;
}
