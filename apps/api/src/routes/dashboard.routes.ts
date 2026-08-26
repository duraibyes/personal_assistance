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

    const loans = await prisma.loan.findMany({ where });
    const totalLoansAmount = loans.reduce((acc, loan) => acc + loan.outstandingAmount, 0);
    const totalMonthlyEmi = loans.reduce((acc, loan) => acc + loan.emiAmount, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const expenses = await prisma.expense.findMany({
      where: {
        ...where,
        date: { gte: startOfMonth },
      },
    });
    const totalExpensesThisMonth = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    const activeVehiclesCount = await prisma.vehicle.count({ where });

    res.json({
      totalLoansCount: loans.length,
      totalLoansAmount,
      totalMonthlyEmi,
      totalExpensesThisMonth,
      activeVehiclesCount,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});
