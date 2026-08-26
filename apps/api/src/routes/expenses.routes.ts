import { Router } from 'express';
import { prisma } from '@repo/database';
import { CreateExpenseSchema } from '@repo/validation';
import { validateBody } from '../middleware/validate.middleware';
import { assertResourceAccess } from '../middleware/auth.middleware';

export const expensesRouter: Router = Router();

/**
 * @openapi
 * /api/expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: List expenses for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expenses
 *   post:
 *     tags: [Expenses]
 *     summary: Create an expense
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Expense created
 */
expensesRouter.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const where = req.user!.isAdmin ? {} : { userId };
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (error) {
    console.error('Fetch expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

expensesRouter.post('/', validateBody(CreateExpenseSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    const expense = await prisma.expense.create({
      data: {
        userId,
        amount: data.amount,
        category: data.category,
        description: data.description,
        date: new Date(data.date),
        paymentMethod: data.paymentMethod,
        vendorName: data.vendorName ?? null,
        transactionId: data.transactionId ?? null,
        upiId: data.upiId ?? null,
        documentId: data.documentId ?? null,
      },
    });
    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

expensesRouter.delete('/:id', async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (!assertResourceAccess(req, expense.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.expense.delete({ where: { id: expense.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});
