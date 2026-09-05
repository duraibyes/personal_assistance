import { Router } from 'express';
import { prisma } from '@repo/database';

export const dashboardRouter: Router = Router();

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard financial summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary metrics
 */
dashboardRouter.get('/summary', async (req, res) => {
  try {
    const userId = req.user!.id;
    const where = req.user!.isAdmin ? {} : { userId };

    const loans = await prisma.loan.findMany({
      where: { ...where, status: 'ACTIVE', isDeleted: false },
    });
    const totalLoansAmount = loans.reduce((acc, loan) => acc + loan.outstandingAmount, 0);
    const totalMonthlyEmi = loans.reduce((acc, loan) => acc + loan.emiAmount, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [expenses, incomes, activeVehiclesCount] = await Promise.all([
      prisma.expense.findMany({ where: { ...where, date: { gte: startOfMonth } } }),
      prisma.income.findMany({ where: { ...where, date: { gte: startOfMonth } } }),
      prisma.vehicle.count({ where }),
    ]);

    const totalExpensesThisMonth = expenses.reduce((acc, exp) => acc + exp.amount, 0);
    const totalIncomeThisMonth = incomes.reduce((acc, inc) => acc + inc.amount, 0);
    const balance = totalIncomeThisMonth - totalExpensesThisMonth - totalMonthlyEmi;

    res.json({
      totalLoansCount: loans.length,
      totalLoansAmount,
      totalMonthlyEmi,
      totalExpensesThisMonth,
      totalIncomeThisMonth,
      balance,
      activeVehiclesCount,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

/**
 * @openapi
 * /api/dashboard/trend:
 *   get:
 *     tags: [Dashboard]
 *     summary: Monthly income vs expense trend
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly trend data
 */
dashboardRouter.get('/trend', async (req, res) => {
  try {
    const userId = req.user!.id;
    const where = req.user!.isAdmin ? {} : { userId };
    const months = Math.min(24, Math.max(1, parseInt(req.query.months as string, 10) || 6));

    const rangeStart = new Date();
    rangeStart.setDate(1);
    rangeStart.setHours(0, 0, 0, 0);
    rangeStart.setMonth(rangeStart.getMonth() - (months - 1));

    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({ where: { ...where, date: { gte: rangeStart } }, select: { amount: true, date: true } }),
      prisma.income.findMany({ where: { ...where, date: { gte: rangeStart } }, select: { amount: true, date: true } }),
    ]);

    const buckets: { key: string; label: string; income: number; expenses: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(rangeStart);
      d.setMonth(d.getMonth() + (months - 1 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      buckets.push({ key, label, income: 0, expenses: 0 });
    }
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));

    for (const exp of expenses) {
      const key = `${exp.date.getFullYear()}-${String(exp.date.getMonth() + 1).padStart(2, '0')}`;
      const idx = bucketIndex.get(key);
      if (idx !== undefined) buckets[idx].expenses += exp.amount;
    }
    for (const inc of incomes) {
      const key = `${inc.date.getFullYear()}-${String(inc.date.getMonth() + 1).padStart(2, '0')}`;
      const idx = bucketIndex.get(key);
      if (idx !== undefined) buckets[idx].income += inc.amount;
    }

    res.json(buckets);
  } catch (error) {
    console.error('Dashboard trend error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard trend' });
  }
});

/**
 * @openapi
 * /api/dashboard/category-breakdown:
 *   get:
 *     tags: [Dashboard]
 *     summary: Expense breakdown by category for a given month
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category breakdown
 */
dashboardRouter.get('/category-breakdown', async (req, res) => {
  try {
    const userId = req.user!.id;
    const where = req.user!.isAdmin ? {} : { userId };

    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
    const rangeStart = new Date(year, month - 1, 1);
    const rangeEnd = new Date(year, month, 1);

    const expenses = await prisma.expense.findMany({
      where: { ...where, date: { gte: rangeStart, lt: rangeEnd } },
      include: { categoryRef: true },
    });

    const totals = new Map<string, { name: string; icon: string | null; total: number }>();
    for (const exp of expenses) {
      const key = exp.categoryRef?.id ?? exp.category;
      const name = exp.categoryRef?.name ?? exp.category;
      const icon = exp.categoryRef?.icon ?? null;
      const existing = totals.get(key);
      if (existing) existing.total += exp.amount;
      else totals.set(key, { name, icon, total: exp.amount });
    }

    const totalsArr = Array.from(totals.values());
    const grandTotal = totalsArr.reduce((acc, t) => acc + t.total, 0);
    const breakdown = totalsArr
      .map((t) => ({ ...t, percentage: grandTotal > 0 ? (t.total / grandTotal) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);

    res.json({ month, year, total: grandTotal, breakdown });
  } catch (error) {
    console.error('Dashboard category breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch category breakdown' });
  }
});

/**
 * @openapi
 * /api/dashboard/recent-transactions:
 *   get:
 *     tags: [Dashboard]
 *     summary: Most recent income and expense transactions combined
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent transactions
 */
dashboardRouter.get('/recent-transactions', async (req, res) => {
  try {
    const userId = req.user!.id;
    const where = req.user!.isAdmin ? {} : { userId };
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 8));

    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { date: 'desc' }, take: limit }),
      prisma.income.findMany({ where, orderBy: { date: 'desc' }, take: limit }),
    ]);

    const merged = [
      ...expenses.map((e) => ({
        id: e.id,
        type: 'EXPENSE' as const,
        description: e.description,
        category: e.category,
        paymentMethod: e.paymentMethod,
        amount: e.amount,
        date: e.date,
      })),
      ...incomes.map((i) => ({
        id: i.id,
        type: 'INCOME' as const,
        description: i.description ?? i.source,
        category: i.source,
        paymentMethod: null,
        amount: i.amount,
        date: i.date,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);

    res.json(merged);
  } catch (error) {
    console.error('Dashboard recent transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch recent transactions' });
  }
});

/**
 * @openapi
 * /api/dashboard/upcoming:
 *   get:
 *     tags: [Dashboard]
 *     summary: Upcoming recurring bills and loan EMIs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming commitments
 */
dashboardRouter.get('/upcoming', async (req, res) => {
  try {
    const userId = req.user!.id;
    const where = req.user!.isAdmin ? {} : { userId };
    const horizonDays = Math.min(180, Math.max(1, parseInt(req.query.days as string, 10) || 45));

    const horizon = new Date();
    horizon.setDate(horizon.getDate() + horizonDays);

    const [recurring, loans] = await Promise.all([
      prisma.recurringExpense.findMany({
        where: { ...where, isActive: true, nextDueDate: { lte: horizon } },
        include: { category: true },
        orderBy: { nextDueDate: 'asc' },
      }),
      prisma.loan.findMany({
        where: { ...where, status: 'ACTIVE', isDeleted: false, nextEmiDate: { lte: horizon } },
        orderBy: { nextEmiDate: 'asc' },
      }),
    ]);

    const upcoming = [
      ...recurring.map((r) => ({
        kind: 'RECURRING' as const,
        id: r.id,
        title: r.title,
        amount: r.amount,
        dueDate: r.nextDueDate,
        category: r.category?.name ?? null,
      })),
      ...loans.map((l) => ({
        kind: 'LOAN_EMI' as const,
        id: l.id,
        title: `${l.name} EMI`,
        amount: l.emiAmount,
        dueDate: l.nextEmiDate,
        category: 'EMI',
      })),
    ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    res.json(upcoming);
  } catch (error) {
    console.error('Dashboard upcoming error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming commitments' });
  }
});
