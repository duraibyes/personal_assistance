import { z } from "zod";

const dateInput = z
  .string()
  .min(1, "Date is required")
  .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" });

export const SignupSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1).optional(),
});

export const LoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const CreateLoanSchema = z.object({
  loanNumber: z.string().optional().nullable(),
  name: z.string().min(1, "Loan name is required"),
  lender: z.string().min(1, "Lender name is required"),
  loanType: z.string().min(1, "Loan type is required"),
  principalAmount: z.coerce.number().positive("Principal must be positive"),
  interestRate: z.coerce.number().positive("Interest rate must be positive"),
  tenureMonths: z.coerce.number().int().positive("Tenure must be positive"),
  emiAmount: z.coerce.number().positive("EMI amount must be positive"),
  startDate: dateInput,
  firstEmiDate: dateInput,
  numberOfEmis: z.coerce.number().int().positive(),
  remainingEmis: z.coerce.number().int().nonnegative().optional(),
  outstandingAmount: z.coerce.number().nonnegative().optional(),
  nextEmiDate: dateInput.optional(),
  status: z.string().optional(),
  processingFee: z.coerce.number().nonnegative().optional().nullable(),
  insuranceAmount: z.coerce.number().nonnegative().optional().nullable(),
  bouncingCharge: z.coerce.number().nonnegative().optional().nullable(),
  lenderAddress: z.string().optional().nullable(),
  lenderContact: z.string().optional().nullable(),
  lenderEmail: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  appliedDate: dateInput.optional().nullable(),
  endDate: dateInput.optional().nullable(),
  documentId: z.string().optional().nullable(),
  attachmentIds: z.array(z.string()).optional(),
  paidEmis: z.coerce.number().int().nonnegative().optional(),
});

export const UpdateLoanSchema = CreateLoanSchema.partial();

export const CreateExpenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  categoryId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  date: dateInput,
  paymentMethod: z.string().min(1, "Payment method is required"),
  vendorName: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
  upiId: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export const CreateIncomeSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  source: z.string().min(1, "Source is required"),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  date: dateInput,
  documentId: z.string().optional().nullable(),
});

export const UpdateIncomeSchema = CreateIncomeSchema.partial();

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  type: z.enum(["EXPENSE", "INCOME", "BOTH"]).default("EXPENSE"),
  icon: z.string().optional().nullable(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["EXPENSE", "INCOME", "BOTH"]).optional(),
  icon: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const CreateRecurringExpenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  categoryId: z.string().optional().nullable(),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"]),
  nextDueDate: dateInput,
  lastPaymentDate: dateInput.optional().nullable(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateRecurringExpenseSchema = CreateRecurringExpenseSchema.partial();

export const UpdateLoanEmiSchema = z.object({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "PARTIAL"]).optional(),
  paidAmount: z.coerce.number().nonnegative("Amount must be zero or positive").optional().nullable(),
  paymentDate: dateInput.optional().nullable(),
  description: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
});

export const BulkPayLoanEmiSchema = z.object({
  mode: z.enum(["ALL", "UNTIL_CURRENT_MONTH"]),
  description: z.string().optional().nullable(),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateLoanInput = z.infer<typeof CreateLoanSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type CreateIncomeInput = z.infer<typeof CreateIncomeSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type CreateRecurringExpenseInput = z.infer<typeof CreateRecurringExpenseSchema>;
export type UpdateLoanEmiInput = z.infer<typeof UpdateLoanEmiSchema>;
export type BulkPayLoanEmiInput = z.infer<typeof BulkPayLoanEmiSchema>;
