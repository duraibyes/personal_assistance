import { Router, Request, Response } from 'express';
import multer from 'multer';
import { SpeechService } from '../services/speech.service';

export const assistantRouter: Router = Router();

// Vercel caps request bodies at ~4.5MB; a 2-minute mono AAC clip is well under that.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

/**
 * @openapi
 * /api/assistant/transcribe:
 *   post:
 *     tags: [Assistant]
 *     summary: Transcribe a voice clip and return it in English and Tamil
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: "{ language, original, english, tamil }"
 */
assistantRouter.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No audio provided.' });
    if (!file.mimetype.startsWith('audio/')) return res.status(400).json({ error: 'File must be an audio recording.' });

    res.json(await SpeechService.transcribe(file.buffer, file.mimetype));
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Could not transcribe the recording. Please try again.' });
  }
});
