import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth } from '../middleware/auth.middleware';

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

expensesRouter.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseData = req.body;
    
    await prisma.user.upsert({
      where: { id: userId },
      update: { email: req.user.email },
      create: { id: userId, email: req.user.email }
    });

    const expense = await prisma.expense.create({
      data: {
        ...expenseData,
        userId
      }
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});
