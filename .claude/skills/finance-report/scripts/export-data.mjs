#!/usr/bin/env node
// Exports income, expense and loan EMI data for a period as JSON for the finance-report skill.
//
// Usage:
//   node .claude/skills/finance-report/scripts/export-data.mjs [period] [scope] [--no-emi] [--sample] [--out file.json]
//   period: --month YYYY-MM | --year YYYY | --from YYYY-MM-DD --to YYYY-MM-DD   (default: current month)
//   scope:  --user email | --all                                              (default: the only user)
//   --sample generates clearly-labelled demo data without touching the database.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const round = (n) => Math.round(n * 100) / 100;

function parseDay(value, flag) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) fail(`${flag} must be YYYY-MM-DD`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Returns { start, end } with `end` exclusive, in local time (matches the dashboard routes). */
function resolveRange(args) {
  if (args.month) {
    const m = /^(\d{4})-(\d{2})$/.exec(args.month);
    if (!m) fail('--month must be YYYY-MM');
    return { start: new Date(Number(m[1]), Number(m[2]) - 1, 1), end: new Date(Number(m[1]), Number(m[2]), 1) };
  }
  if (args.year) {
    if (!/^\d{4}$/.test(args.year)) fail('--year must be YYYY');
    const y = Number(args.year);
    return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
  if (args.from || args.to) {
    if (!args.from || !args.to) fail('--from and --to must be used together');
    const start = parseDay(args.from, '--from');
    const end = parseDay(args.to, '--to');
    end.setDate(end.getDate() + 1);
    if (end <= start) fail('--to must not be before --from');
    return { start, end };
  }
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

function groupTotals(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const name = keyFn(row) || 'Uncategorised';
    const g = groups.get(name) ?? { name, total: 0, count: 0 };
    g.total += row.amount;
    g.count += 1;
    groups.set(name, g);
  }
  const grand = rows.reduce((acc, r) => acc + r.amount, 0);
  return [...groups.values()]
    .map((g) => ({ ...g, total: round(g.total), share: grand > 0 ? round((g.total / grand) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

async function loadFromDatabase(args, start, end) {
  const envPath = path.join(repoRoot, '.env');
  if (!process.env.DATABASE_URL && fs.existsSync(envPath)) process.loadEnvFile(envPath);
  // Resolve @prisma/client from the database package so this script runs from anywhere in the repo.
  const { PrismaClient } = createRequire(path.join(repoRoot, 'packages/database/package.json'))('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true }, orderBy: { email: 'asc' } });
    const userList = users.map((u) => `  - ${u.email}${u.name ? ` (${u.name})` : ''}`).join('\n');

    let user = null;
    if (args.user) {
      user = users.find((u) => u.email.toLowerCase() === String(args.user).toLowerCase());
      if (!user) fail(`No user with email ${args.user}. Users:\n${userList}`, 2);
    } else if (!args.all) {
      if (users.length !== 1) fail(`Multiple users found — pass --user <email> or --all. Users:\n${userList}`, 2);
      user = users[0];
    }

    const userWhere = user ? { userId: user.id } : {};
    const dateRange = { gte: start, lt: end };
    const includeEmi = !args['no-emi'];

    const [incomes, expenses, payments, foreclosures] = await Promise.all([
      prisma.income.findMany({ where: { ...userWhere, date: dateRange }, include: { categoryRef: true }, orderBy: { date: 'asc' } }),
      prisma.expense.findMany({ where: { ...userWhere, date: dateRange }, include: { categoryRef: true }, orderBy: { date: 'asc' } }),
      includeEmi
        ? prisma.loanPayment.findMany({
            where: { status: { in: ['PAID', 'PARTIAL'] }, paymentDate: dateRange, loan: { ...userWhere, isDeleted: false } },
            include: { loan: true },
            orderBy: { paymentDate: 'asc' },
          })
        : [],
      includeEmi
        ? prisma.loan.findMany({ where: { ...userWhere, isDeleted: false, status: 'FORECLOSED', foreclosureDate: dateRange } })
        : [],
    ]);

    const incomeRows = incomes.map((i) => ({
      date: fmtDate(i.date),
      amount: i.amount,
      source: i.source,
      category: i.categoryRef?.name ?? '',
      description: i.description ?? '',
    }));

    const expenseRows = expenses.map((e) => ({
      date: fmtDate(e.date),
      amount: e.amount,
      category: e.categoryRef?.name ?? e.category,
      description: e.description,
      paymentMethod: e.paymentMethod,
      vendor: e.vendorName ?? '',
    }));

    // A foreclosure marks every remaining installment PAID at its full due amount on the settlement date.
    // The cash actually paid is Loan.foreclosureAmount, so collapse those installments into one settlement row.
    const foreclosedById = new Map(foreclosures.map((l) => [l.id, l]));
    const settledSums = new Map();
    const emiRows = [];
    for (const p of payments) {
      const loan = foreclosedById.get(p.loanId);
      const amount = p.paidAmount ?? p.dueAmount;
      if (loan && fmtDate(p.paymentDate) === fmtDate(loan.foreclosureDate)) {
        settledSums.set(loan.id, (settledSums.get(loan.id) ?? 0) + amount);
        continue;
      }
      emiRows.push({
        date: fmtDate(p.paymentDate),
        amount,
        loan: p.loan.name,
        lender: p.loan.lender,
        emiNumber: p.emiNumber,
        type: p.status === 'PARTIAL' ? 'Partial EMI' : 'EMI',
        note: p.description ?? '',
      });
    }
    for (const loan of foreclosures) {
      const scheduled = round(settledSums.get(loan.id) ?? 0);
      const amount = loan.foreclosureAmount ?? scheduled;
      if (!amount) continue;
      emiRows.push({
        date: fmtDate(loan.foreclosureDate),
        amount,
        loan: loan.name,
        lender: loan.lender,
        emiNumber: null,
        type: 'Foreclosure',
        note:
          loan.foreclosureAmount == null
            ? 'Foreclosure amount not recorded; using sum of settled installments'
            : `Settled remaining installments (scheduled ${scheduled})`,
      });
    }

    return {
      scope: user ? user.name || user.email : 'All users',
      userEmail: user?.email ?? null,
      includeEmi,
      incomeRows,
      expenseRows,
      emiRows,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/** Deterministic demo data for previewing the report layout. Never present it as the user's figures. */
function sampleData(args, start, end) {
  let seed = 20260914;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const between = (lo, hi) => Math.round(lo + rand() * (hi - lo));
  const spending = [
    ['Groceries', 700, 3200, 6, 'UPI'],
    ['Rent', 18000, 18000, 1, 'BANK_TRANSFER'],
    ['Fuel', 1200, 2600, 3, 'CARD'],
    ['Utilities', 900, 2800, 2, 'UPI'],
    ['Dining out', 350, 2100, 4, 'CARD'],
    ['Medical', 250, 3800, 1, 'UPI'],
    ['Shopping', 800, 6500, 2, 'CARD'],
    ['School fees', 4500, 4500, 1, 'BANK_TRANSFER'],
    ['Mobile & internet', 799, 799, 1, 'UPI'],
  ];
  const incomeRows = [];
  const expenseRows = [];
  const emiRows = [];
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d < end; d.setMonth(d.getMonth() + 1)) {
    const y = d.getFullYear();
    const m = d.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const on = (day) => fmtDate(new Date(y, m, Math.min(day, days)));
    incomeRows.push({ date: on(1), amount: 92000, source: 'Salary', category: 'Salary', description: 'Monthly salary (sample)' });
    if (rand() < 0.45) {
      incomeRows.push({ date: on(between(6, 26)), amount: between(4000, 18000), source: 'Freelance', category: 'Side income', description: 'Client project (sample)' });
    }
    if (m === 2 || m === 8) incomeRows.push({ date: on(20), amount: 6400, source: 'Dividends', category: 'Investments', description: 'Quarterly payout (sample)' });
    for (const [category, lo, hi, count, paymentMethod] of spending) {
      for (let i = 0; i < count; i++) {
        expenseRows.push({ date: on(between(1, days)), amount: between(lo, hi), category, description: `${category} (sample)`, paymentMethod, vendor: '' });
      }
    }
    emiRows.push({ date: on(5), amount: 12450, loan: 'Car loan', lender: 'Sample Bank', emiNumber: m + 1, type: 'EMI', note: '' });
    emiRows.push({ date: on(10), amount: 4200, loan: 'Phone EMI', lender: 'Sample Finance', emiNumber: m + 1, type: 'EMI', note: '' });
  }
  const inRange = (r) => r.date >= fmtDate(start) && r.date < fmtDate(end);
  const includeEmi = !args['no-emi'];
  return {
    scope: 'Sample data',
    userEmail: null,
    includeEmi,
    incomeRows: incomeRows.filter(inRange),
    expenseRows: expenseRows.filter(inRange),
    emiRows: includeEmi ? emiRows.filter(inRange) : [],
  };
}

const args = parseArgs(process.argv.slice(2));
const { start, end } = resolveRange(args);
const lastDay = new Date(end);
lastDay.setDate(lastDay.getDate() - 1);

let source;
try {
  source = args.sample ? sampleData(args, start, end) : await loadFromDatabase(args, start, end);
} catch (error) {
  fail(`Export failed: ${String(error?.message ?? error).trim()}`);
}

const byDate = (a, b) => a.date.localeCompare(b.date);
const incomeRows = source.incomeRows.sort(byDate);
const expenseRows = source.expenseRows.sort(byDate);
const emiRows = source.emiRows.sort(byDate);

const monthly = [];
for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d < end; d.setMonth(d.getMonth() + 1)) {
  monthly.push({ month: monthKey(d), label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), income: 0, expenses: 0, emi: 0 });
}
const byMonth = new Map(monthly.map((m) => [m.month, m]));
for (const r of incomeRows) byMonth.get(r.date.slice(0, 7)).income += r.amount;
for (const r of expenseRows) byMonth.get(r.date.slice(0, 7)).expenses += r.amount;
for (const r of emiRows) byMonth.get(r.date.slice(0, 7)).emi += r.amount;
for (const m of monthly) {
  m.income = round(m.income);
  m.expenses = round(m.expenses);
  m.emi = round(m.emi);
  m.net = round(m.income - m.expenses - m.emi);
}

const sum = (rows) => round(rows.reduce((acc, r) => acc + r.amount, 0));
const totalIncome = sum(incomeRows);
const totalExpenses = sum(expenseRows);
const totalEmi = sum(emiRows);
const totalOutflow = round(totalExpenses + totalEmi);
const net = round(totalIncome - totalOutflow);

const report = {
  meta: {
    generatedAt: new Date().toISOString(),
    from: fmtDate(start),
    to: fmtDate(lastDay),
    scope: source.scope,
    userEmail: source.userEmail,
    currency: 'INR',
    includesEmi: source.includeEmi,
    sample: Boolean(args.sample),
  },
  summary: {
    totalIncome,
    totalExpenses,
    totalEmi,
    totalOutflow,
    net,
    savingsRate: totalIncome > 0 ? round((net / totalIncome) * 100) : null,
    counts: { incomes: incomeRows.length, expenses: expenseRows.length, emis: emiRows.length },
  },
  monthly,
  expenseByCategory: groupTotals(expenseRows, (r) => r.category),
  incomeBySource: groupTotals(incomeRows, (r) => r.source),
  expenseByPaymentMethod: groupTotals(expenseRows, (r) => r.paymentMethod),
  emiByLoan: groupTotals(emiRows, (r) => r.loan),
  incomes: incomeRows,
  expenses: expenseRows,
  emis: emiRows,
};

const defaultName = `finance-${report.meta.from}_to_${report.meta.to}${args.sample ? '-sample' : ''}.json`;
const outPath = path.resolve(args.out && args.out !== true ? args.out : path.join(repoRoot, 'reports', defaultName));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify({ file: outPath, meta: report.meta, summary: report.summary }, null, 2));
