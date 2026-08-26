import { Router } from 'express';
import { prisma } from '@repo/database';
import { CreateRecurringExpenseSchema, UpdateRecurringExpenseSchema } from '@repo/validation';
import { validateBody } from '../middleware/validate.middleware';
import { assertResourceAccess } from '../middleware/auth.middleware';

export const recurringRouter: Router = Router();

/**
 * @openapi
 * /api/recurring:
 *   get:
 *     tags: [Recurring]
 *     summary: List recurring expenses/bills for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recurring expenses
 *   post:
 *     tags: [Recurring]
 *     summary: Create a recurring expense
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Recurring expense created
 */
recurringRouter.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const activeOnly = req.query.active === 'true';

    const where: any = req.user!.isAdmin ? {} : { userId };
    if (activeOnly) where.isActive = true;

    const recurring = await prisma.recurringExpense.findMany({
      where,
      include: { category: true },
      orderBy: { nextDueDate: 'asc' },
    });
    res.json(recurring);
  } catch (error) {
    console.error('Fetch recurring expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch recurring expenses' });
  }
});

recurringRouter.post('/', validateBody(CreateRecurringExpenseSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    const recurring = await prisma.recurringExpense.create({
      data: {
        userId,
        title: data.title,
        amount: data.amount,
        categoryId: data.categoryId ?? null,
        frequency: data.frequency,
        nextDueDate: new Date(data.nextDueDate),
        lastPaymentDate: data.lastPaymentDate ? new Date(data.lastPaymentDate) : null,
        paymentMethod: data.paymentMethod,
        notes: data.notes ?? null,
        isActive: data.isActive ?? true,
      },
    });
    res.status(201).json(recurring);
  } catch (error) {
    console.error('Create recurring expense error:', error);
    res.status(500).json({ error: 'Failed to create recurring expense' });
  }
});

recurringRouter.patch('/:id', validateBody(UpdateRecurringExpenseSchema), async (req, res) => {
  try {
    const recurring = await prisma.recurringExpense.findUnique({ where: { id: req.params.id } });
    if (!recurring) {
      return res.status(404).json({ error: 'Recurring expense not found' });
    }
    if (!assertResourceAccess(req, recurring.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const data = req.body;
    const updated = await prisma.recurringExpense.update({
      where: { id: recurring.id },
      data: {
        title: data.title,
        amount: data.amount,
        categoryId: data.categoryId,
        frequency: data.frequency,
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
        lastPaymentDate: data.lastPaymentDate ? new Date(data.lastPaymentDate) : undefined,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        isActive: data.isActive,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Update recurring expense error:', error);
    res.status(500).json({ error: 'Failed to update recurring expense' });
  }
});

recurringRouter.delete('/:id', async (req, res) => {
  try {
    const recurring = await prisma.recurringExpense.findUnique({ where: { id: req.params.id } });
    if (!recurring) {
      return res.status(404).json({ error: 'Recurring expense not found' });
    }
    if (!assertResourceAccess(req, recurring.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Soft deactivate — preserves history instead of deleting the record.
    await prisma.recurringExpense.update({
      where: { id: recurring.id },
      data: { isActive: false },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Delete recurring expense error:', error);
    res.status(500).json({ error: 'Failed to delete recurring expense' });
  }
});
