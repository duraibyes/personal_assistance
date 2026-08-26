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

    res.status(500).json({ error: 'Failed to extract data' });
  }
});

export default router;
