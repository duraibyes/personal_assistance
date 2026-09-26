import { prisma } from '@repo/database';

/**
 * Read-only data tools for Professor. The model never writes SQL: it picks one of these
 * fixed queries, and every query is hard-scoped to the signed-in user's id on the server.
 * Dates are interpreted in IST, which is how the app records them.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MAX_LIST = 50;

export type ToolDef = {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
};

const dateProp = (what: string) => ({ type: 'string', description: `${what} date, YYYY-MM-DD (inclusive, IST)` });

export const TOOLS: ToolDef[] = [
  {
    name: 'get_financial_overview',
    description:
      'Totals for a period: income, expenses, net savings, transaction counts, plus current active-loan totals (estimated payoff, monthly EMI) and recurring expenses due in the period. Good first call for broad questions like "how am I doing this month".',
    parameters: {
      type: 'object',
      properties: { from: dateProp('Start'), to: dateProp('End') },
      required: ['from', 'to'],
    },
  },
  {
    name: 'summarize_expenses',
    description:
      'Sum, count and average of expenses in a period, optionally grouped (by category, month, payment_method or vendor) and filtered by category or vendor text. Use for "how much did I spend on X", "which category is highest", month-by-month trends.',
    parameters: {
      type: 'object',
      properties: {
        from: dateProp('Start'),
        to: dateProp('End'),
        group_by: { type: 'string', enum: ['none', 'category', 'month', 'payment_method', 'vendor'] },
        category: { type: 'string', description: 'Case-insensitive partial match on category name' },
        vendor: { type: 'string', description: 'Case-insensitive partial match on vendor name' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'list_expenses',
    description: 'Individual expense transactions (newest or largest first). Use to show specific transactions or find a purchase.',
    parameters: {
      type: 'object',
      properties: {
        from: dateProp('Start'),
        to: dateProp('End'),
        category: { type: 'string', description: 'Partial match on category' },
        search: { type: 'string', description: 'Partial match on description or vendor' },
        min_amount: { type: 'number' },
        sort: { type: 'string', enum: ['date_desc', 'amount_desc'] },
        limit: { type: 'integer', description: `Max rows, up to ${MAX_LIST}` },
      },
    },
  },
  {
    name: 'summarize_income',
    description: 'Sum and count of income in a period, optionally grouped by source, category or month.',
    parameters: {
      type: 'object',
      properties: {
        from: dateProp('Start'),
        to: dateProp('End'),
        group_by: { type: 'string', enum: ['none', 'source', 'category', 'month'] },
        source: { type: 'string', description: 'Partial match on income source' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'list_income',
    description: 'Individual income entries, newest first.',
    parameters: {
      type: 'object',
      properties: {
        from: dateProp('Start'),
        to: dateProp('End'),
        search: { type: 'string', description: 'Partial match on source or description' },
        limit: { type: 'integer', description: `Max rows, up to ${MAX_LIST}` },
      },
    },
  },
  {
    name: 'list_loans',
    description:
      'The user\'s loans with lender, type, principal, interest rate, EMI, EMIs paid/remaining, overdue EMIs, estimated_payoff_now (principal still owed if closed today, before foreclosure charges), remaining_emi_payments_total, next EMI date, end date, and data_issues where the loan record looks out of date. EMI counts and dates come from the EMI schedule when one exists.',
    parameters: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['ACTIVE', 'CLOSED', 'FORECLOSED', 'ALL'], description: 'Default ACTIVE' } },
    },
  },
  {
    name: 'list_loan_payments',
    description: 'EMI schedule/payment rows (due date, due amount, status PENDING/PAID/OVERDUE/PARTIAL, paid amount and date). Filter by loan id (from list_loans), status or due-date range.',
    parameters: {
      type: 'object',
      properties: {
        loan_id: { type: 'string' },
        status: { type: 'string', enum: ['PENDING', 'PAID', 'OVERDUE', 'PARTIAL'] },
        from: dateProp('Due-from'),
        to: dateProp('Due-to'),
        limit: { type: 'integer', description: `Max rows, up to ${MAX_LIST}` },
      },
    },
  },
  {
    name: 'list_recurring_expenses',
    description: 'Recurring bills/subscriptions with amount, frequency, next due date and payment method.',
    parameters: { type: 'object', properties: { include_inactive: { type: 'boolean' } } },
  },
  {
    name: 'list_vehicles',
    description: 'Vehicles with purchase info, total service and fuel spend, last service, and insurance expiry.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_purchases',
    description: 'Recorded purchases (items bought) in a period.',
    parameters: {
      type: 'object',
      properties: { from: dateProp('Start'), to: dateProp('End'), limit: { type: 'integer' } },
    },
  },
  {
    name: 'list_categories',
    description: 'Expense/income category names available to the user, to map words like "food" or "petrol" to real categories.',
    parameters: { type: 'object', properties: {} },
  },
];

// ---------- helpers ----------

type Args = Record<string, unknown>;

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const limitOf = (v: unknown, def = 20) => Math.min(MAX_LIST, Math.max(1, Math.floor(num(v) ?? def)));
const money = (n: number) => Math.round(n * 100) / 100;
const contains = (v: string) => ({ contains: v, mode: 'insensitive' as const });

function parseDay(v: unknown, label: string): Date {
  const s = str(v);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${label} must be YYYY-MM-DD`);
  const d = new Date(`${s}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) throw new Error(`${label} is not a valid date`);
  return d;
}

/** Inclusive IST day range → [gte, lt) instants. Either end may be missing on optional-range tools. */
function range(from: unknown, to: unknown, required: boolean) {
  if (!required && from === undefined && to === undefined) return undefined;
  const r: { gte?: Date; lt?: Date } = {};
  if (from !== undefined || required) r.gte = parseDay(from, 'from');
  if (to !== undefined || required) r.lt = new Date(parseDay(to, 'to').getTime() + 24 * 60 * 60 * 1000);
  return r;
}

export const istDay = (d: Date | null | undefined) =>
  d ? new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10) : null;
const istMonth = (d: Date) => istDay(d)!.slice(0, 7);

function group<T>(rows: T[], key: (r: T) => string, amount: (r: T) => number) {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const k = key(r) || '(none)';
    const g = map.get(k) ?? { total: 0, count: 0 };
    g.total += amount(r);
    g.count += 1;
    map.set(k, g);
  }
  return Array.from(map.entries()).map(([k, g]) => ({ key: k, total: money(g.total), count: g.count }));
}

function summarize<T>(rows: T[], amount: (r: T) => number) {
  const total = rows.reduce((s, r) => s + amount(r), 0);
  return { total: money(total), count: rows.length, average: rows.length ? money(total / rows.length) : 0 };
}

type LoanWithSchedule = {
  status: string;
  paidEmis: number;
  remainingEmis: number;
  nextEmiDate: Date;
  endDate: Date | null;
  payments: { dueDate: Date; dueAmount: number; status: string; paymentDate: Date | null }[];
};

/**
 * The EMI schedule (LoanPayment rows) is the source of truth; the loan's summary fields are only
 * recomputed when an EMI is edited, so imported loans can drift. Returns schedule-derived facts plus
 * plain-language notes wherever the loan record disagrees with them or can't be trusted.
 */
function reconcileLoan(l: LoanWithSchedule, today: string) {
  const issues: string[] = [];
  const recordedNext = istDay(l.nextEmiDate)!;

  if (!l.payments.length) {
    if (l.status === 'ACTIVE' && recordedNext < today) {
      issues.push(
        `Loan record says the next EMI was due on ${recordedNext}, which is in the past, and there is no EMI schedule to confirm payments. The loan may be closed or the record not updated.`
      );
    }
    return { schedule: null, issues };
  }

  const unpaid = l.payments.filter((p) => p.status !== 'PAID');
  const paid = l.payments.filter((p) => p.status === 'PAID');
  const overdue = unpaid.filter((p) => istDay(p.dueDate)! < today);
  const upcoming = unpaid.find((p) => istDay(p.dueDate)! >= today);
  const lastPaid = paid[paid.length - 1];

  const schedule = {
    paid: paid.length,
    remaining: unpaid.length,
    nextDue: upcoming ? istDay(upcoming.dueDate) : null,
    lastPaid: lastPaid ? { due_date: istDay(lastPaid.dueDate), paid_on: istDay(lastPaid.paymentDate) } : null,
    overdue: overdue.length
      ? { count: overdue.length, amount: money(overdue.reduce((s, p) => s + p.dueAmount, 0)), oldest_due: istDay(overdue[0].dueDate) }
      : null,
    lastDue: istDay(l.payments[l.payments.length - 1].dueDate),
  };

  if (l.status === 'ACTIVE' && !unpaid.length) issues.push('Every EMI in the schedule is paid, but the loan is still marked ACTIVE. It should probably be closed.');
  if (l.status !== 'ACTIVE' && unpaid.length) issues.push(`Loan is marked ${l.status} but ${unpaid.length} EMIs in the schedule are not marked paid.`);
  if (l.status === 'ACTIVE' && recordedNext < today) {
    issues.push(
      `Loan record still shows the next EMI as ${recordedNext} (in the past); the EMI schedule says ${schedule.nextDue ? `the next one is due ${schedule.nextDue}` : 'none are upcoming'}.`
    );
  }
  if (l.paidEmis !== paid.length || l.remainingEmis !== unpaid.length) {
    issues.push(`Loan record says ${l.paidEmis} paid / ${l.remainingEmis} remaining, but the EMI schedule shows ${paid.length} paid / ${unpaid.length} remaining.`);
  }
  if (l.endDate && istDay(l.endDate) !== schedule.lastDue && l.status === 'ACTIVE') {
    issues.push(`Loan record says it ends on ${istDay(l.endDate)}, but the last EMI in the schedule is due ${schedule.lastDue}.`);
  }
  if (l.status === 'ACTIVE' && overdue.length) {
    issues.push(`${overdue.length} EMI(s) from ${schedule.overdue!.oldest_due} are past due and not marked paid: either overdue or paid but not recorded.`);
  }
  return { schedule, issues };
}

type LoanTerms = { principalAmount: number; interestRate: number; emiAmount: number; numberOfEmis: number };

/** Whether the stored EMI matches the standard reducing-balance EMI for principal/rate/tenure (within 3%). */
function emiMatchesTerms(l: LoanTerms) {
  const r = l.interestRate / 12 / 100;
  if (r <= 0 || l.numberOfEmis <= 0) return true;
  const implied = (l.principalAmount * r * (1 + r) ** l.numberOfEmis) / ((1 + r) ** l.numberOfEmis - 1);
  return Math.abs(implied - l.emiAmount) / l.emiAmount <= 0.03;
}

/**
 * Estimated principal still owed on a reducing-balance loan: the present value of the remaining EMIs
 * at the loan's rate. Roughly what a lender asks to close it today, before foreclosure charges/GST.
 * Less reliable when the stored EMI doesn't fit the loan's terms (see emiMatchesTerms).
 */
function estimatePayoff(l: LoanTerms, remaining: number) {
  if (remaining <= 0) return 0;
  const r = l.interestRate / 12 / 100;
  if (r <= 0) return money(l.emiAmount * remaining);
  return money((l.emiAmount * (1 - (1 + r) ** -remaining)) / r);
}

/** For loans with no schedule: next EMI + (remaining - 1) months, only when the next EMI date is still current. */
function projectedEnd(l: { status: string; nextEmiDate: Date; remainingEmis: number }, today: string) {
  if (l.status !== 'ACTIVE' || l.remainingEmis <= 0 || istDay(l.nextEmiDate)! < today) return null;
  const d = new Date(l.nextEmiDate.getTime() + IST_OFFSET_MS);
  d.setUTCMonth(d.getUTCMonth() + l.remainingEmis - 1);
  return d.toISOString().slice(0, 10);
}

// ---------- tool implementations ----------

type Impl = (userId: string, args: Args) => Promise<unknown>;

const IMPLS: Record<string, Impl> = {
  async get_financial_overview(userId, a) {
    const date = range(a.from, a.to, true)!;
    const [exp, inc, loans, recurring] = await Promise.all([
      prisma.expense.aggregate({ where: { userId, date }, _sum: { amount: true }, _count: true }),
      prisma.income.aggregate({ where: { userId, date }, _sum: { amount: true }, _count: true }),
      prisma.loan.findMany({
        where: { userId, status: 'ACTIVE', isDeleted: false },
        select: {
          principalAmount: true,
          interestRate: true,
          emiAmount: true,
          numberOfEmis: true,
          remainingEmis: true,
          payments: { select: { status: true } },
        },
      }),
      prisma.recurringExpense.findMany({
        where: { userId, isActive: true, nextDueDate: date },
        select: { title: true, amount: true, nextDueDate: true },
        orderBy: { nextDueDate: 'asc' },
      }),
    ]);
    const income = inc._sum.amount ?? 0;
    const expenses = exp._sum.amount ?? 0;
    const payoffs = loans.map((l) =>
      estimatePayoff(l, l.payments.length ? l.payments.filter((p) => p.status !== 'PAID').length : l.remainingEmis)
    );
    return {
      period: { from: a.from, to: a.to },
      income: { total: money(income), count: inc._count },
      expenses: { total: money(expenses), count: exp._count },
      net_savings: money(income - expenses),
      active_loans_now: {
        count: loans.length,
        estimated_total_payoff: money(payoffs.reduce((s, p) => s + p, 0)),
        total_monthly_emi: money(loans.reduce((s, l) => s + l.emiAmount, 0)),
      },
      recurring_due_in_period: recurring.map((r) => ({ title: r.title, amount: money(r.amount), due: istDay(r.nextDueDate) })),
    };
  },

  async summarize_expenses(userId, a) {
    const date = range(a.from, a.to, true)!;
    const category = str(a.category);
    const vendor = str(a.vendor);
    const rows = await prisma.expense.findMany({
      where: {
        userId,
        date,
        ...(category && { OR: [{ category: contains(category) }, { categoryRef: { name: contains(category) } }] }),
        ...(vendor && { vendorName: contains(vendor) }),
      },
      select: { amount: true, category: true, date: true, paymentMethod: true, vendorName: true, categoryRef: { select: { name: true } } },
    });
    const by = str(a.group_by) ?? 'none';
    const keyFn: Record<string, (r: (typeof rows)[number]) => string> = {
      category: (r) => r.categoryRef?.name ?? r.category,
      month: (r) => istMonth(r.date),
      payment_method: (r) => r.paymentMethod,
      vendor: (r) => r.vendorName ?? '',
    };
    const groups = keyFn[by] ? group(rows, keyFn[by], (r) => r.amount) : undefined;
    if (groups) groups.sort(by === 'month' ? (x, y) => x.key.localeCompare(y.key) : (x, y) => y.total - x.total);
    return { period: { from: a.from, to: a.to }, filters: { category, vendor }, ...summarize(rows, (r) => r.amount), group_by: by, groups };
  },

  async list_expenses(userId, a) {
    const category = str(a.category);
    const search = str(a.search);
    const rows = await prisma.expense.findMany({
      where: {
        userId,
        date: range(a.from, a.to, false),
        ...(num(a.min_amount) !== undefined && { amount: { gte: num(a.min_amount) } }),
        AND: [
          ...(category ? [{ OR: [{ category: contains(category) }, { categoryRef: { name: contains(category) } }] }] : []),
          ...(search ? [{ OR: [{ description: contains(search) }, { vendorName: contains(search) }] }] : []),
        ],
      },
      orderBy: a.sort === 'amount_desc' ? { amount: 'desc' } : { date: 'desc' },
      take: limitOf(a.limit),
      select: { amount: true, category: true, description: true, date: true, paymentMethod: true, vendorName: true, categoryRef: { select: { name: true } } },
    });
    return {
      count: rows.length,
      expenses: rows.map((r) => ({
        date: istDay(r.date),
        amount: money(r.amount),
        category: r.categoryRef?.name ?? r.category,
        description: r.description,
        vendor: r.vendorName,
        payment_method: r.paymentMethod,
      })),
    };
  },

  async summarize_income(userId, a) {
    const date = range(a.from, a.to, true)!;
    const source = str(a.source);
    const rows = await prisma.income.findMany({
      where: { userId, date, ...(source && { source: contains(source) }) },
      select: { amount: true, source: true, date: true, categoryRef: { select: { name: true } } },
    });
    const by = str(a.group_by) ?? 'none';
    const keyFn: Record<string, (r: (typeof rows)[number]) => string> = {
      source: (r) => r.source,
      category: (r) => r.categoryRef?.name ?? '',
      month: (r) => istMonth(r.date),
    };
    const groups = keyFn[by] ? group(rows, keyFn[by], (r) => r.amount) : undefined;
    if (groups) groups.sort(by === 'month' ? (x, y) => x.key.localeCompare(y.key) : (x, y) => y.total - x.total);
    return { period: { from: a.from, to: a.to }, filters: { source }, ...summarize(rows, (r) => r.amount), group_by: by, groups };
  },

  async list_income(userId, a) {
    const search = str(a.search);
    const rows = await prisma.income.findMany({
      where: {
        userId,
        date: range(a.from, a.to, false),
        ...(search && { OR: [{ source: contains(search) }, { description: contains(search) }] }),
      },
      orderBy: { date: 'desc' },
      take: limitOf(a.limit),
      select: { amount: true, source: true, description: true, date: true, categoryRef: { select: { name: true } } },
    });
    return {
      count: rows.length,
      income: rows.map((r) => ({
        date: istDay(r.date),
        amount: money(r.amount),
        source: r.source,
        category: r.categoryRef?.name ?? null,
        description: r.description,
      })),
    };
  },

  async list_loans(userId, a) {
    const status = str(a.status) ?? 'ACTIVE';
    const loans = await prisma.loan.findMany({
      where: { userId, isDeleted: false, ...(status !== 'ALL' && { status }) },
      orderBy: { startDate: 'asc' },
      include: {
        payments: { select: { dueDate: true, dueAmount: true, status: true, paymentDate: true }, orderBy: { dueDate: 'asc' } },
      },
    });
    const today = istDay(new Date())!;
    return {
      status_filter: status,
      count: loans.length,
      loans: loans.map((l) => {
        const { schedule, issues } = reconcileLoan(l, today);
        if (l.status === 'ACTIVE' && !emiMatchesTerms(l)) {
          issues.push(
            `The EMI of ${money(l.emiAmount)} doesn't match a ${l.interestRate}% loan of ${money(l.principalAmount)} over ${l.numberOfEmis} EMIs; one of these details may be wrong, so the payoff estimate is rough.`
          );
        }
        return {
          id: l.id,
          name: l.name,
          lender: l.lender,
          loan_type: l.loanType,
          status: l.status,
          principal: money(l.principalAmount),
          interest_rate_pct: l.interestRate,
          tenure_months: l.tenureMonths,
          emi_amount: money(l.emiAmount),
          total_emis: l.numberOfEmis,
          paid_emis: schedule?.paid ?? l.paidEmis,
          remaining_emis: schedule?.remaining ?? l.remainingEmis,
          estimated_payoff_now: estimatePayoff(l, schedule?.remaining ?? l.remainingEmis),
          payoff_estimate_confidence: emiMatchesTerms(l) ? 'good' : 'low (EMI does not match principal/rate/tenure)',
          remaining_emi_payments_total: money(l.emiAmount * (schedule?.remaining ?? l.remainingEmis)),
          start_date: istDay(l.startDate),
          first_emi_date: istDay(l.firstEmiDate),
          next_emi_date: schedule ? schedule.nextDue : l.status === 'ACTIVE' && istDay(l.nextEmiDate)! >= today ? istDay(l.nextEmiDate) : null,
          last_paid_emi: schedule?.lastPaid ?? null,
          overdue_emis: schedule?.overdue ?? null,
          // Closed/foreclosed loans keep their recorded end date; active ones end with their last scheduled EMI.
          end_date: (l.status === 'ACTIVE' && schedule?.lastDue) || istDay(l.endDate) || projectedEnd(l, today),
          end_date_source: l.status === 'ACTIVE' && schedule ? 'last EMI in schedule' : l.endDate ? 'recorded' : 'projected',
          data_source: schedule ? 'EMI schedule' : 'loan record (no EMI schedule)',
          data_issues: issues,
          foreclosure_date: istDay(l.foreclosureDate),
          foreclosure_amount: l.foreclosureAmount,
          processing_fee: l.processingFee,
          insurance_amount: l.insuranceAmount,
        };
      }),
    };
  },

  async list_loan_payments(userId, a) {
    const loanId = str(a.loan_id);
    const status = str(a.status);
    const rows = await prisma.loanPayment.findMany({
      where: {
        loan: { userId, isDeleted: false, ...(loanId && { id: loanId }) },
        ...(status && { status }),
        dueDate: range(a.from, a.to, false),
      },
      orderBy: { dueDate: 'asc' },
      take: limitOf(a.limit, 24),
      select: {
        emiNumber: true,
        dueDate: true,
        dueAmount: true,
        status: true,
        paidAmount: true,
        paymentDate: true,
        loan: { select: { id: true, name: true, lender: true } },
      },
    });
    return {
      count: rows.length,
      payments: rows.map((p) => ({
        loan: `${p.loan.name} (${p.loan.lender})`,
        loan_id: p.loan.id,
        emi_number: p.emiNumber,
        due_date: istDay(p.dueDate),
        due_amount: money(p.dueAmount),
        status: p.status,
        is_overdue: p.status !== 'PAID' && istDay(p.dueDate)! < istDay(new Date())!,
        paid_amount: p.paidAmount,
        paid_on: istDay(p.paymentDate),
      })),
    };
  },

  async list_recurring_expenses(userId, a) {
    const rows = await prisma.recurringExpense.findMany({
      where: { userId, ...(a.include_inactive !== true && { isActive: true }) },
      orderBy: { nextDueDate: 'asc' },
      include: { category: { select: { name: true } } },
    });
    return {
      count: rows.length,
      recurring: rows.map((r) => ({
        title: r.title,
        amount: money(r.amount),
        frequency: r.frequency,
        category: r.category?.name ?? null,
        next_due: istDay(r.nextDueDate),
        last_paid: istDay(r.lastPaymentDate),
        payment_method: r.paymentMethod,
        active: r.isActive,
      })),
    };
  },

  async list_vehicles(userId) {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
      include: {
        services: { select: { amount: true, serviceDate: true, serviceType: true }, orderBy: { serviceDate: 'desc' } },
        fuelEntries: { select: { amount: true, liters: true } },
        insurances: { select: { provider: true, expiryDate: true, premium: true }, orderBy: { expiryDate: 'desc' }, take: 1 },
      },
    });
    return {
      count: vehicles.length,
      vehicles: vehicles.map((v) => ({
        name: v.name,
        make_model: `${v.manufacturer} ${v.model}`,
        registration: v.registrationNumber,
        purchase_date: istDay(v.purchaseDate),
        purchase_price: v.purchasePrice,
        current_mileage: v.currentMileage,
        service_spend_total: money(v.services.reduce((s, x) => s + x.amount, 0)),
        services_count: v.services.length,
        last_service: v.services[0] ? { date: istDay(v.services[0].serviceDate), type: v.services[0].serviceType } : null,
        fuel_spend_total: money(v.fuelEntries.reduce((s, x) => s + x.amount, 0)),
        fuel_liters_total: money(v.fuelEntries.reduce((s, x) => s + x.liters, 0)),
        insurance: v.insurances[0]
          ? { provider: v.insurances[0].provider, expires: istDay(v.insurances[0].expiryDate), premium: v.insurances[0].premium }
          : null,
      })),
    };
  },

  async list_purchases(userId, a) {
    const rows = await prisma.purchase.findMany({
      where: { userId, purchaseDate: range(a.from, a.to, false) },
      orderBy: { purchaseDate: 'desc' },
      take: limitOf(a.limit),
    });
    return {
      count: rows.length,
      purchases: rows.map((p) => ({ date: istDay(p.purchaseDate), item: p.item, amount: money(p.amount), category: p.category, vendor: p.vendor })),
    };
  },

  async list_categories(userId) {
    const rows = await prisma.expenseCategory.findMany({
      where: { isActive: true, OR: [{ userId }, { userId: null }] },
      select: { name: true, type: true },
      orderBy: { name: 'asc' },
    });
    return { categories: rows };
  },
};

/** Runs a tool for this user and returns a JSON string. Errors come back as data so the model can report them. */
export async function runTool(userId: string, name: string, args: unknown): Promise<string> {
  const impl = IMPLS[name];
  if (!impl) return JSON.stringify({ error: `Unknown tool ${name}` });
  try {
    const safeArgs = args && typeof args === 'object' && !Array.isArray(args) ? (args as Args) : {};
    return JSON.stringify(await impl(userId, safeArgs));
  } catch (err) {
    console.error(`Professor tool ${name} failed:`, err);
    const message = err instanceof Error && /YYYY-MM-DD|valid date/.test(err.message) ? err.message : 'Could not fetch this data right now.';
    return JSON.stringify({ error: message });
  }
}
