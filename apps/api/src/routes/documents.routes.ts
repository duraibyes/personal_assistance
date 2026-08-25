import { Router, Request, Response } from 'express';
import multer from 'multer';
import { StorageService } from '../services/storage.service';
import { OcrService } from '../services/ocr.service';
import { prisma } from '@repo/database'; // Assuming prisma is exported here

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a document
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { userId, documentType } = req.body; // e.g., 'LOAN' or 'EXPENSE'

    if (!file) {
      return res.status(400).json({ error: 'No file provided.' });
    }
    if (!userId || !documentType) {
      return res.status(400).json({ error: 'userId and documentType are required.' });
    }

    // 1. Upload to Vercel Blob
    const blob = await StorageService.uploadFile(file.originalname, file.buffer, file.mimetype);

    // 2. Create Document record in DB
    const document = await prisma.document.create({
      data: {
        userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        storageKey: blob.url, // Storing the full URL for easy access
        documentType,
        processingStatus: 'UPLOADED',
      },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Extract data from document
router.post('/:id/extract', async (req: Request, res: Response) => {
  try {
    const documentId = req.params.id;

    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Fetch the file buffer from the blob URL. 
    // In production, consider streaming or using Vercel Blob APIs directly if needed.
    const fileResponse = await fetch(document.storageKey);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from storage');
    }
    
    const arrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Update status to PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'PROCESSING' },
    });

    // Run AI OCR Extraction
    const extractedData = await OcrService.extractStructuredData(
      fileBuffer,
      document.mimeType,
      document.documentType as 'LOAN' | 'EXPENSE'
    );

    // Save Extraction Results
    const extraction = await prisma.documentExtraction.create({
      data: {
        documentId,
        structuredData: extractedData as any,
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
    
    // Update status to FAILED
    await prisma.document.update({
      where: { id: req.params.id },
      data: { processingStatus: 'FAILED' },
    });

    res.status(500).json({ error: 'Failed to extract data' });
  }
});

export default router;
