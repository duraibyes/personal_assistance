import { Router } from 'express';
import { prisma } from '@repo/database';
import { CreateLoanSchema, UpdateLoanSchema } from '@repo/validation';
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
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
    const search = (req.query.search as string || '').trim();
    const status = req.query.status as string | undefined;
    const loanType = req.query.loanType as string | undefined;

    const where: any = req.user!.isAdmin ? { isDeleted: false } : { userId, isDeleted: false };
    if (status) where.status = status;
    if (loanType) where.loanType = loanType;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lender: { contains: search, mode: 'insensitive' } },
        { loanNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.loan.count({ where }),
    ]);

    res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error('Fetch loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

loansRouter.get('/:id', async (req, res) => {
  try {
    const loan = await prisma.loan.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: { attachments: true }
    });
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
        loanNumber: data.loanNumber ?? null,
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
        bouncingCharge: data.bouncingCharge ?? null,
        lenderAddress: data.lenderAddress ?? null,
        lenderContact: data.lenderContact ?? null,
        lenderEmail: data.lenderEmail ?? null,
        appliedDate: data.appliedDate ? new Date(data.appliedDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        documentId: data.documentId ?? null,
        attachments: data.attachmentIds?.length ? {
          connect: data.attachmentIds.map((id: string) => ({ id }))
        } : undefined,
      },
      include: { attachments: true },
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

    await prisma.loan.update({
      where: { id: loan.id },
      data: { isDeleted: true },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

loansRouter.put('/:id', validateBody(UpdateLoanSchema), async (req, res) => {
  try {
    const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    if (!assertResourceAccess(req, loan.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const data = req.body;
    const remainingEmis = data.remainingEmis ?? data.numberOfEmis;
    const outstandingAmount = data.outstandingAmount ?? data.principalAmount;
    const nextEmiDate = data.nextEmiDate ?? data.firstEmiDate;

    const updatedLoan = await prisma.loan.update({
      where: { id: loan.id },
      data: {
        loanNumber: data.loanNumber,
        name: data.name,
        lender: data.lender,
        loanType: data.loanType,
        principalAmount: data.principalAmount,
        interestRate: data.interestRate,
        tenureMonths: data.tenureMonths,
        emiAmount: data.emiAmount,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        firstEmiDate: data.firstEmiDate ? new Date(data.firstEmiDate) : undefined,
        numberOfEmis: data.numberOfEmis,
        paidEmis: data.paidEmis,
        remainingEmis,
        outstandingAmount,
        nextEmiDate: nextEmiDate ? new Date(nextEmiDate) : undefined,
        status: data.status,
        processingFee: data.processingFee,
        insuranceAmount: data.insuranceAmount,
        bouncingCharge: data.bouncingCharge,
        lenderAddress: data.lenderAddress,
        lenderContact: data.lenderContact,
        lenderEmail: data.lenderEmail,
        appliedDate: data.appliedDate ? new Date(data.appliedDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        documentId: data.documentId,
        attachments: data.attachmentIds ? {
          set: data.attachmentIds.map((id: string) => ({ id }))
        } : undefined,
      },
      include: { attachments: true },
    });

    res.json(updatedLoan);
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});
