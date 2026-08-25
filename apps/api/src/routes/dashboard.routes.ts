import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth } from '../middleware/auth.middleware';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Total loans amount
    const loans = await prisma.loan.findMany({ where: { userId } });
    const totalLoansAmount = loans.reduce((acc, loan) => acc + loan.outstandingAmount, 0);
    const totalMonthlyEmi = loans.reduce((acc, loan) => acc + loan.emiAmount, 0);
    
    // Total expenses this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth }
      }
    });
    const totalExpensesThisMonth = expenses.reduce((acc, exp) => acc + exp.amount, 0);
    
    const activeVehiclesCount = await prisma.vehicle.count({ where: { userId } });
    
    res.json({
      totalLoansAmount,
      totalMonthlyEmi,
      totalExpensesThisMonth,
      activeVehiclesCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});
