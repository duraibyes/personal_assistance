import { Router } from 'express';
import { prisma } from '@repo/database';
import { UpdateLoanEmiSchema, BulkPayLoanEmiSchema } from '@repo/validation';
import { validateBody } from '../middleware/validate.middleware';
import { assertResourceAccess } from '../middleware/auth.middleware';

export const loanEmiRouter: Router = Router({ mergeParams: true });

async function loadOwnedLoan(req: any) {
  const loan = await prisma.loan.findUnique({ where: { id: req.params.loanId } });
  if (!loan) return { loan: null, error: { status: 404, message: 'Loan not found' } };
  if (!assertResourceAccess(req, loan.userId)) return { loan: null, error: { status: 403, message: 'Forbidden' } };
  return { loan, error: null };
}

/** Recomputes paidEmis/remainingEmis/outstandingAmount/nextEmiDate/status from the actual EMI rows. */
async function syncLoanFromEmis(loanId: string) {
  const [loan, emis] = await Promise.all([
    prisma.loan.findUniqueOrThrow({ where: { id: loanId } }),
    prisma.loanPayment.findMany({ where: { loanId }, orderBy: { emiNumber: 'asc' } }),
  ]);

  const paidEmis = emis.filter((e) => e.status === 'PAID').length;
  const totalPaid = emis.reduce((acc, e) => acc + (e.status === 'PAID' || e.status === 'PARTIAL' ? e.paidAmount || 0 : 0), 0);
  const outstandingAmount = Math.max(0, loan.principalAmount - totalPaid);
  const remainingEmis = Math.max(0, loan.numberOfEmis - paidEmis);
  const nextPending = emis.find((e) => e.status === 'PENDING' || e.status === 'OVERDUE');
  const nextEmiDate = nextPending ? nextPending.dueDate : emis[emis.length - 1]?.dueDate || loan.nextEmiDate;
  const allPaid = emis.length > 0 && emis.every((e) => e.status === 'PAID');
  const isForeclosed = loan.status === 'FORECLOSED';

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      paidEmis,
      remainingEmis,
      // A foreclosed loan is settled in full regardless of what the installment rows sum to.
      outstandingAmount: isForeclosed ? 0 : outstandingAmount,
      nextEmiDate,
      status: isForeclosed ? 'FORECLOSED' : allPaid ? 'CLOSED' : loan.status === 'CLOSED' ? 'ACTIVE' : loan.status,
    },
  });
}

/**
 * @openapi
 * /api/loans/{loanId}/emis:
 *   get:
 *     tags: [Loans]
 *     summary: Get (and lazily generate) the monthly EMI schedule for a loan
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: EMI schedule
 */
loanEmiRouter.get('/', async (req, res) => {
  try {
    const { loan, error } = await loadOwnedLoan(req);
    if (error) return res.status(error.status).json({ error: error.message });

    const existingCount = await prisma.loanPayment.count({ where: { loanId: loan!.id } });

    if (existingCount === 0) {
      const rows = Array.from({ length: loan!.numberOfEmis }, (_, i) => {
        const dueDate = new Date(loan!.firstEmiDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        return {
          loanId: loan!.id,
          emiNumber: i + 1,
          dueDate,
          dueAmount: loan!.emiAmount,
          status: 'PENDING',
        };
      });
      await prisma.loanPayment.createMany({ data: rows });
    }

    // Auto-flip any past-due PENDING rows to OVERDUE.
    await prisma.loanPayment.updateMany({
      where: { loanId: loan!.id, status: 'PENDING', dueDate: { lt: new Date() } },
      data: { status: 'OVERDUE' },
    });

    const emis = await prisma.loanPayment.findMany({
      where: { loanId: loan!.id },
      include: { document: true },
      orderBy: { emiNumber: 'asc' },
    });

    res.json({ loan, emis });
  } catch (error) {
    console.error('Fetch loan EMI schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch EMI schedule' });
  }
});

/**
 * @openapi
 * /api/loans/{loanId}/emis/{emiId}:
 *   patch:
 *     tags: [Loans]
 *     summary: Record or update a payment against a specific EMI installment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated EMI installment
 */
loanEmiRouter.patch('/:emiId', validateBody(UpdateLoanEmiSchema), async (req, res) => {
  try {
    const { loan, error } = await loadOwnedLoan(req);
    if (error) return res.status(error.status).json({ error: error.message });

    const emi = await prisma.loanPayment.findUnique({ where: { id: req.params.emiId } });
    if (!emi || emi.loanId !== loan!.id) {
      return res.status(404).json({ error: 'EMI installment not found' });
    }

    const data = req.body;
    let status = data.status;
    if (!status && data.paidAmount !== undefined && data.paidAmount !== null) {
      status = data.paidAmount >= emi.dueAmount ? 'PAID' : 'PARTIAL';
    }

    const updated = await prisma.loanPayment.update({
      where: { id: emi.id },
      data: {
        status: status ?? undefined,
        paidAmount: data.paidAmount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : data.paymentDate,
        description: data.description,
        documentId: data.documentId,
      },
      include: { document: true },
    });

    await syncLoanFromEmis(loan!.id);

    res.json(updated);
  } catch (error) {
    console.error('Update loan EMI error:', error);
    res.status(500).json({ error: 'Failed to update EMI installment' });
  }
});

/**
 * @openapi
 * /api/loans/{loanId}/emis/bulk-pay:
 *   post:
 *     tags: [Loans]
 *     summary: Bulk-mark EMI installments as paid, using each installment's own due date as the payment date
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated EMI schedule
 */
loanEmiRouter.post('/bulk-pay', validateBody(BulkPayLoanEmiSchema), async (req, res) => {
  try {
    const { loan, error } = await loadOwnedLoan(req);
    if (error) return res.status(error.status).json({ error: error.message });

    const { mode, description, foreclosureAmount, foreclosureDate } = req.body;
    const isForeclosure = mode === 'FORECLOSURE';
    const settlementDate = isForeclosure ? (foreclosureDate ? new Date(foreclosureDate) : new Date()) : null;

    const where: any = { loanId: loan!.id, status: { not: 'PAID' } };
    if (mode === 'UNTIL_CURRENT_MONTH') {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      where.dueDate = { lte: endOfToday };
    }

    const targets = await prisma.loanPayment.findMany({ where });

    if (targets.length > 0) {
      await prisma.$transaction(
        targets.map((t) =>
          prisma.loanPayment.update({
            where: { id: t.id },
            data: {
              status: 'PAID',
              paidAmount: t.dueAmount,
              // A foreclosure settles every remaining installment on the settlement date itself.
              paymentDate: isForeclosure ? settlementDate! : t.dueDate,
              description: description ?? (isForeclosure ? 'Settled by foreclosure' : t.description),
            },
          })
        )
      );
    }

    if (isForeclosure) {
      await prisma.loan.update({
        where: { id: loan!.id },
        data: {
          status: 'FORECLOSED',
          foreclosureDate: settlementDate!,
          foreclosureAmount,
          endDate: settlementDate!,
        },
      });
    }

    if (targets.length > 0 || isForeclosure) {
      await syncLoanFromEmis(loan!.id);
    }

    const emis = await prisma.loanPayment.findMany({
      where: { loanId: loan!.id },
      include: { document: true },
      orderBy: { emiNumber: 'asc' },
    });

    res.json({ updated: targets.length, emis });
  } catch (error) {
    console.error('Bulk pay loan EMI error:', error);
    res.status(500).json({ error: 'Failed to bulk update EMI payments' });
  }
});
