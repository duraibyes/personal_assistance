export interface AmortizationScheduleRow {
  month: number;
  paymentDate: Date;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  outstandingBalance: number;
}

/**
 * Calculates the Equated Monthly Installment (EMI)
 * Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * @param principal The loan amount
 * @param annualInterestRate Annual interest rate in percentage (e.g. 10.5 for 10.5%)
 * @param tenureMonths Total number of months for the loan
 * @returns The fixed monthly EMI amount
 */
export function calculateEMI(principal: number, annualInterestRate: number, tenureMonths: number): number {
  if (principal <= 0 || annualInterestRate <= 0 || tenureMonths <= 0) {
    return 0;
  }
  
  const r = (annualInterestRate / 12) / 100;
  const n = tenureMonths;
  
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Number(emi.toFixed(2));
}

/**
 * Generates the full amortization schedule for a loan
 */
export function generateAmortizationSchedule(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number,
  startDate: Date
): AmortizationScheduleRow[] {
  const emiAmount = calculateEMI(principal, annualInterestRate, tenureMonths);
  const r = (annualInterestRate / 12) / 100;
  
  let outstandingBalance = principal;
  const schedule: AmortizationScheduleRow[] = [];
  
  let currentDate = new Date(startDate.getTime());

  for (let i = 1; i <= tenureMonths; i++) {
    // Increment month
    currentDate.setMonth(currentDate.getMonth() + 1);
    
    const interestComponent = Number((outstandingBalance * r).toFixed(2));
    const principalComponent = Number((emiAmount - interestComponent).toFixed(2));
    
    outstandingBalance = Number((outstandingBalance - principalComponent).toFixed(2));
    
    // Account for rounding errors in the last month
    if (i === tenureMonths || outstandingBalance < 0) {
      outstandingBalance = 0;
    }

    schedule.push({
      month: i,
      paymentDate: new Date(currentDate.getTime()),
      emiAmount,
      principalComponent,
      interestComponent,
      outstandingBalance
    });
  }

  return schedule;
}
