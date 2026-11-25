import { Router, Request, Response } from 'express';
import multer from 'multer';
import { StorageService, StorageEntityType } from '../services/storage.service';
import { OcrService } from '../services/ocr.service';
import { prisma } from '@repo/database';
import { assertResourceAccess } from '../middleware/auth.middleware';

const router: Router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const ENTITY_FOLDER_MAP: Record<string, StorageEntityType> = {
  LOAN: 'loans',
  EXPENSE: 'expenses',
  INCOME: 'incomes',
  PURCHASE: 'purchases',
  VEHICLE: 'vehicles',
  DOCUMENT: 'documents',
};

/**
 * @openapi
 * /api/documents/upload:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a document to Cloudinary
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, documentType, entityId]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [LOAN, EXPENSE, INCOME, PURCHASE, VEHICLE, DOCUMENT]
 *               entityId:
 *                 type: string
 *                 description: Parent entity id (e.g. loan id)
 *     responses:
 *       201:
 *         description: Document uploaded
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { documentType, entityId } = req.body;
    const userId = req.user!.id;

    if (!file) {
      return res.status(400).json({ error: 'No file provided.' });
    }
    if (!documentType || !entityId) {
      return res.status(400).json({ error: 'documentType and entityId are required.' });
    }

    const entityType = ENTITY_FOLDER_MAP[String(documentType).toUpperCase()];
    if (!entityType) {
      return res.status(400).json({
        error: 'Invalid documentType. Use LOAN, EXPENSE, INCOME, PURCHASE, VEHICLE, or DOCUMENT.',
      });
    }

    const uploaded = await StorageService.uploadFile(file.originalname, file.buffer, file.mimetype, {
      entityType,
      entityId: String(entityId),
    });

    const document = await prisma.document.create({
      data: {
        userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        storageKey: uploaded.url,
        documentType: String(documentType).toUpperCase(),
        processingStatus: 'UPLOADED',
      },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * @openapi
 * /api/documents/library:
 *   get:
 *     tags: [Documents]
 *     summary: Fetch unused documents from the user's media library
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [LOAN, EXPENSE, INCOME, PURCHASE, VEHICLE, DOCUMENT]
 *         required: false
 *         description: Filter unused documents by document type
 *     responses:
 *       200:
 *         description: List of unused documents with extractions
 */
router.get('/library', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query;

    // Get all used document IDs across entities
    const usedLoans = await prisma.loan.findMany({ where: { userId, documentId: { not: null } }, select: { documentId: true } });
    const usedExpenses = await prisma.expense.findMany({ where: { userId, documentId: { not: null } }, select: { documentId: true } });
    const usedIncomes = await prisma.income.findMany({ where: { userId, documentId: { not: null } }, select: { documentId: true } });
    const usedPurchases = await prisma.purchase.findMany({ where: { userId, documentId: { not: null } }, select: { documentId: true } });
    const usedServices = await prisma.vehicleService.findMany({ where: { vehicle: { userId }, documentId: { not: null } }, select: { documentId: true } });
    const usedInsurances = await prisma.insurance.findMany({ where: { vehicle: { userId }, documentId: { not: null } }, select: { documentId: true } });

    const usedIds = [
      ...usedLoans.map(l => l.documentId),
      ...usedExpenses.map(e => e.documentId),
      ...usedIncomes.map(i => i.documentId),
      ...usedPurchases.map(p => p.documentId),
      ...usedServices.map(v => v.documentId),
      ...usedInsurances.map(i => i.documentId),
    ].filter(Boolean) as string[];

    const whereClause: any = {
      userId,
      inVault: false, // vault documents are kept on their own, not offered for linking
      id: { notIn: usedIds }
    };

    if (type) {
      whereClause.documentType = String(type).toUpperCase();
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        extractions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    console.error('Fetch library error:', error);
    res.status(500).json({ error: 'Failed to fetch media library' });
  }
});

// ---------------------------------------------------------------------------
// Document vault — proofs and personal records kept in one place.
// ---------------------------------------------------------------------------

export const VAULT_CATEGORIES = [
  'ID_PROOF', // Aadhaar, PAN, passport, licence, voter ID
  'EDUCATION', // school / college certificates, mark sheets
  'SCHOOL_FEES',
  'VEHICLE_SERVICE',
  'ELECTRICITY_BILL',
  'INTERNET_BILL',
  'MEDICAL',
  'INSURANCE',
  'PROPERTY',
  'OTHER',
] as const;

type VaultFields = {
  title: string;
  category: string;
  amount: number | null;
  recordDate: Date | null;
  notes: string | null;
};

/** Reads and checks vault fields from a JSON or multipart body. `partial` allows missing fields (edit). */
function parseVaultFields(body: Record<string, unknown>, partial: boolean): { data?: Partial<VaultFields>; error?: string } {
  const data: Partial<VaultFields> = {};
  const has = (k: string) => body[k] !== undefined;

  if (has('title') || !partial) {
    const title = String(body.title ?? '').trim();
    if (!title) return { error: 'Title is required.' };
    if (title.length > 120) return { error: 'Title must be 120 characters or fewer.' };
    data.title = title;
  }
  if (has('category') || !partial) {
    const category = String(body.category ?? '').toUpperCase();
    if (!(VAULT_CATEGORIES as readonly string[]).includes(category)) return { error: 'Invalid category.' };
    data.category = category;
  }
  if (has('amount')) {
    const raw = body.amount;
    if (raw === null || raw === '') data.amount = null;
    else {
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount < 0 || amount > 1e10) return { error: 'Amount must be a positive number.' };
      data.amount = amount;
    }
  }
  if (has('recordDate')) {
    const raw = body.recordDate;
    if (raw === null || raw === '') data.recordDate = null;
    else {
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) return { error: 'Invalid date.' };
      data.recordDate = d;
    }
  }
  if (has('notes')) {
    const notes = body.notes === null ? '' : String(body.notes).trim();
    if (notes.length > 1000) return { error: 'Notes must be 1000 characters or fewer.' };
    data.notes = notes || null;
  }
  return { data };
}

const VAULT_SELECT = {
  id: true,
  fileName: true,
  mimeType: true,
  storageKey: true,
  title: true,
  category: true,
  amount: true,
  recordDate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * @openapi
 * /api/documents/vault:
 *   get:
 *     tags: [Documents]
 *     summary: List the user's vault documents (proofs, ID cards, certificates, bills)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vault documents, newest record date first
 */
router.get('/vault', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const category = req.query.category ? String(req.query.category).toUpperCase() : undefined;
    const search = req.query.search ? String(req.query.search).trim() : '';

    const documents = await prisma.document.findMany({
      where: {
        userId,
        inVault: true,
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: VAULT_SELECT,
      orderBy: [{ recordDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
    res.json(documents);
  } catch (error) {
    console.error('Vault list error:', error);
    res.status(500).json({ error: 'Failed to load documents' });
  }
});

/**
 * @openapi
 * /api/documents/vault:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a file to Cloudinary and save it in the document vault
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, title, category]
 *             properties:
 *               file: { type: string, format: binary }
 *               title: { type: string }
 *               category: { type: string }
 *               amount: { type: number }
 *               recordDate: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Document saved
 */
router.post('/vault', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Please attach a photo or file.' });
    if (!/^image\/|^application\/pdf$/.test(file.mimetype)) {
      return res.status(400).json({ error: 'Only images and PDF files are supported.' });
    }

    const { data, error } = parseVaultFields(req.body ?? {}, false);
    if (error || !data) return res.status(400).json({ error });

    // Prefix with a timestamp so two files with the same name (e.g. "image.jpg") never overwrite each other.
    const uploaded = await StorageService.uploadFile(`${Date.now()}_${file.originalname}`, file.buffer, file.mimetype, {
      entityType: 'documents',
      entityId: userId,
    });

    const document = await prisma.document.create({
      data: {
        userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        storageKey: uploaded.url,
        documentType: 'DOCUMENT',
        processingStatus: 'UPLOADED',
        inVault: true,
        title: data.title!,
        category: data.category!,
        amount: data.amount ?? null,
        recordDate: data.recordDate ?? null,
        notes: data.notes ?? null,
      },
      select: VAULT_SELECT,
    });
    res.status(201).json(document);
  } catch (error) {
    console.error('Vault upload error:', error);
    res.status(500).json({ error: 'Failed to save document' });
  }
});

/**
 * @openapi
 * /api/documents/vault/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get one vault document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The document
 */
router.get('/vault/:id', async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      select: { ...VAULT_SELECT, userId: true, inVault: true },
    });
    if (!document || !document.inVault) return res.status(404).json({ error: 'Document not found' });
    if (!assertResourceAccess(req, document.userId)) return res.status(403).json({ error: 'Forbidden' });
    const { userId: _userId, inVault: _inVault, ...rest } = document;
    res.json(rest);
  } catch (error) {
    console.error('Vault get error:', error);
    res.status(500).json({ error: 'Failed to load document' });
  }
});

/**
 * @openapi
 * /api/documents/vault/{id}:
 *   put:
 *     tags: [Documents]
 *     summary: Edit a vault document's details, optionally replacing the file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document updated
 */
router.put('/vault/:id', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.inVault) return res.status(404).json({ error: 'Document not found' });
    if (!assertResourceAccess(req, existing.userId)) return res.status(403).json({ error: 'Forbidden' });

    const { data, error } = parseVaultFields(req.body ?? {}, true);
    if (error || !data) return res.status(400).json({ error });

    const file = req.file;
    let fileData: { fileName: string; mimeType: string; storageKey: string } | undefined;
    if (file) {
      if (!/^image\/|^application\/pdf$/.test(file.mimetype)) {
        return res.status(400).json({ error: 'Only images and PDF files are supported.' });
      }
      const uploaded = await StorageService.uploadFile(`${Date.now()}_${file.originalname}`, file.buffer, file.mimetype, {
        entityType: 'documents',
        entityId: existing.userId,
      });
      fileData = { fileName: file.originalname, mimeType: file.mimetype, storageKey: uploaded.url };
    }

    const document = await prisma.document.update({
      where: { id: existing.id },
      data: { ...data, ...fileData },
      select: VAULT_SELECT,
    });

    if (fileData) StorageService.deleteByUrl(existing.storageKey).catch((e) => console.warn('Old file cleanup failed:', e));
    res.json(document);
  } catch (error) {
    console.error('Vault update error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

/**
 * @openapi
 * /api/documents/vault/{id}:
 *   delete:
 *     tags: [Documents]
 *     summary: Delete a vault document and its file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete('/vault/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.inVault) return res.status(404).json({ error: 'Document not found' });
    if (!assertResourceAccess(req, existing.userId)) return res.status(403).json({ error: 'Forbidden' });

    await prisma.$transaction([
      prisma.documentExtraction.deleteMany({ where: { documentId: existing.id } }),
      prisma.document.delete({ where: { id: existing.id } }),
    ]);
    StorageService.deleteByUrl(existing.storageKey).catch((e) => console.warn('File cleanup failed:', e));
    res.status(204).end();
  } catch (error) {
    console.error('Vault delete error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * @openapi
 * /api/documents/{id}/extract:
 *   post:
 *     tags: [Documents]
 *     summary: Run OCR extraction on a document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Extraction result
 */
router.post('/:id/extract', async (req: Request, res: Response) => {
  try {
    const documentId = req.params.id;

    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!assertResourceAccess(req, document.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const fileResponse = await fetch(document.storageKey);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from storage');
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'PROCESSING' },
    });

    const extractedData = await OcrService.extractStructuredData(
      fileBuffer,
      document.mimeType,
      document.documentType as 'LOAN' | 'EXPENSE'
    );

    const extraction = await prisma.documentExtraction.create({
      data: {
        documentId,
        structuredData: extractedData as object,
        processingStatus: 'COMPLETED',
      },
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'EXTRACTED' },
    });

    res.json({ document, extraction });
  } catch (error) {
    console.error('Extraction Error:', error);

    try {
      await prisma.document.update({
        where: { id: req.params.id },
        data: { processingStatus: 'FAILED' },
      });
    } catch {
      // ignore secondary failure
    }

    res.status(500).json({ error: 'Failed to extract data: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

export default router;
