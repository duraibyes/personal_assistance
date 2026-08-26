import { Router } from 'express';
import { prisma } from '@repo/database';
import { CreateLoanSchema } from '@repo/validation';
import { validateBody } from '../middleware/validate.middleware';
import { assertResourceAccess } from '../middleware/auth.middleware';

export const loansRouter: Router = Router();

/**
 * @openapi
 * /api/loans:
 *   get:
 *     tags: [Loans]
 *     summary: List loans for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of loans
 *   post:
 *     tags: [Loans]
 *     summary: Create a loan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Loan created
 */
loansRouter.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const where = req.user!.isAdmin ? {} : { userId };
    const loans = await prisma.loan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(loans);
  } catch (error) {
    console.error('Fetch loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

loansRouter.get('/:id', async (req, res) => {
  try {
    const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    if (!assertResourceAccess(req, loan.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(loan);
  } catch (error) {
    console.error('Fetch loan error:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
});

loansRouter.post('/', validateBody(CreateLoanSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    const remainingEmis = data.remainingEmis ?? data.numberOfEmis;
    const outstandingAmount = data.outstandingAmount ?? data.principalAmount;
    const nextEmiDate = data.nextEmiDate ?? data.firstEmiDate;

    const loan = await prisma.loan.create({
      data: {
        userId,
        name: data.name,
        lender: data.lender,
        loanType: data.loanType,
        principalAmount: data.principalAmount,
        interestRate: data.interestRate,
        tenureMonths: data.tenureMonths,
        emiAmount: data.emiAmount,
        startDate: new Date(data.startDate),
        firstEmiDate: new Date(data.firstEmiDate),
        numberOfEmis: data.numberOfEmis,
        paidEmis: data.paidEmis ?? 0,
        remainingEmis,
        outstandingAmount,
        nextEmiDate: new Date(nextEmiDate),
        status: data.status ?? 'ACTIVE',
        processingFee: data.processingFee ?? null,
        insuranceAmount: data.insuranceAmount ?? null,
        documentId: data.documentId ?? null,
      },
    });
    res.status(201).json(loan);
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

loansRouter.delete('/:id', async (req, res) => {
  try {
    const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    if (!assertResourceAccess(req, loan.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.loanPayment.deleteMany({ where: { loanId: loan.id } });
    await prisma.loan.delete({ where: { id: loan.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});
