import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth } from '../middleware/auth.middleware';

export const loansRouter = Router();

loansRouter.use(requireAuth);

loansRouter.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const loans = await prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

loansRouter.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const loanData = req.body;
    
    // Ensure the user exists in our DB before creating the loan
    await prisma.user.upsert({
      where: { id: userId },
      update: { email: req.user.email },
      create: { id: userId, email: req.user.email }
    });

    const loan = await prisma.loan.create({
      data: {
        ...loanData,
        userId
      }
    });
    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create loan' });
  }
});
