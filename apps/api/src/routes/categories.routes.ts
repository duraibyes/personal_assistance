import { Router } from 'express';
import { prisma } from '@repo/database';
import { CreateCategorySchema, UpdateCategorySchema } from '@repo/validation';
import { validateBody } from '../middleware/validate.middleware';
import { assertResourceAccess } from '../middleware/auth.middleware';

export const categoriesRouter: Router = Router();

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List categories available to the authenticated user (system defaults + their own)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *   post:
 *     tags: [Categories]
 *     summary: Create a category
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Category created
 */
categoriesRouter.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const type = req.query.type as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';

    const where: any = {
      OR: [{ userId: null }, { userId }],
    };
    if (!includeInactive) where.isActive = true;
    if (type) where.type = { in: [type, 'BOTH'] };

    const categories = await prisma.expenseCategory.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    res.json(categories);
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

categoriesRouter.post('/', validateBody(CreateCategorySchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    const category = await prisma.expenseCategory.create({
      data: {
        userId,
        name: data.name,
        type: data.type ?? 'EXPENSE',
        icon: data.icon ?? null,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

categoriesRouter.patch('/:id', validateBody(UpdateCategorySchema), async (req, res) => {
  try {
    const category = await prisma.expenseCategory.findUnique({ where: { id: req.params.id } });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (category.isSystem) {
      return res.status(403).json({ error: 'System categories cannot be modified' });
    }
    if (!category.userId || !assertResourceAccess(req, category.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.expenseCategory.update({
      where: { id: category.id },
      data: req.body,
    });
    res.json(updated);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

categoriesRouter.delete('/:id', async (req, res) => {
  try {
    const category = await prisma.expenseCategory.findUnique({ where: { id: req.params.id } });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (category.isSystem) {
      return res.status(403).json({ error: 'System categories cannot be deleted' });
    }
    if (!category.userId || !assertResourceAccess(req, category.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Soft delete only — historical expenses/income may still reference this category.
    await prisma.expenseCategory.update({
      where: { id: category.id },
      data: { isActive: false },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});
