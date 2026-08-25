import { z } from "zod";

export const CreateLoanSchema = z.object({
  name: z.string().min(1, "Loan name is required"),
  lender: z.string().min(1, "Lender name is required"),
  loanType: z.string().min(1, "Loan type is required"),
  principalAmount: z.number().positive("Principal must be positive"),
  interestRate: z.number().positive("Interest rate must be positive"),
  tenureMonths: z.number().int().positive("Tenure must be positive"),
  emiAmount: z.number().positive("EMI amount must be positive"),
  startDate: z.string().datetime(),
  firstEmiDate: z.string().datetime(),
  numberOfEmis: z.number().int().positive(),
  documentId: z.string().optional(),
});

export type CreateLoanInput = z.infer<typeof CreateLoanSchema>;
