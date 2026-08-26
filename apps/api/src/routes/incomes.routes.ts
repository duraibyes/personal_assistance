import { Router } from 'express';
import { prisma } from '@repo/database';
import { CreateIncomeSchema, UpdateIncomeSchema } from '@repo/validation';
import { validateBody } from '../middleware/validate.middleware';
import { assertResourceAccess } from '../middleware/auth.middleware';

export const incomesRouter: Router = Router();

/**
 * @openapi
 * /api/incomes:
 *   get:
 *     tags: [Incomes]
 *     summary: List income records for the authenticated user (search, filter, paginate)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of income records
 *   post:
 *     tags: [Incomes]
 *     summary: Create an income record
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Income created
 */
incomesRouter.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
    const search = (req.query.search as string || '').trim();
    const categoryId = req.query.categoryId as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const minAmount = req.query.minAmount as string | undefined;
    const maxAmount = req.query.maxAmount as string | undefined;

    const where: any = req.user!.isAdmin ? {} : { userId };
    if (categoryId) where.categoryId = categoryId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }
    if (search) {
      where.OR = [
        { source: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.income.findMany({
        where,
        include: { categoryRef: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.income.count({ where }),
    ]);

    res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error('Fetch incomes error:', error);
    res.status(500).json({ error: 'Failed to fetch income records' });
  }
});

incomesRouter.get('/:id', async (req, res) => {
  try {
    const income = await prisma.income.findUnique({
      where: { id: req.params.id },
      include: { categoryRef: true },
    });
    if (!income) {
      return res.status(404).json({ error: 'Income not found' });
    }
    if (!assertResourceAccess(req, income.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(income);
  } catch (error) {
    console.error('Fetch income error:', error);
    res.status(500).json({ error: 'Failed to fetch income' });
  }
});

incomesRouter.post('/', validateBody(CreateIncomeSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    const income = await prisma.income.create({
      data: {
        userId,
        amount: data.amount,
        source: data.source,
        categoryId: data.categoryId ?? null,
        description: data.description ?? null,
        date: new Date(data.date),
        documentId: data.documentId ?? null,
      },
    });
    res.status(201).json(income);
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ error: 'Failed to create income' });
  }
});

incomesRouter.put('/:id', validateBody(UpdateIncomeSchema), async (req, res) => {
  try {
    const income = await prisma.income.findUnique({ where: { id: req.params.id } });
    if (!income) {
      return res.status(404).json({ error: 'Income not found' });
    }
    if (!assertResourceAccess(req, income.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const data = req.body;
    const updated = await prisma.income.update({
      where: { id: income.id },
      data: {
        amount: data.amount,
        source: data.source,
        categoryId: data.categoryId,
        description: data.description,
        date: data.date ? new Date(data.date) : undefined,
        documentId: data.documentId,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({ error: 'Failed to update income' });
  }
});

incomesRouter.delete('/:id', async (req, res) => {
  try {
    const income = await prisma.income.findUnique({ where: { id: req.params.id } });
    if (!income) {
      return res.status(404).json({ error: 'Income not found' });
    }
    if (!assertResourceAccess(req, income.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.income.delete({ where: { id: income.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ error: 'Failed to delete income' });
  }
});
