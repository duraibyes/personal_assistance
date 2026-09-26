import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { SpeechService } from '../services/speech.service';
import { ProfessorService } from '../services/professor/professor.service';

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

const askSchema = z.object({
  // Recent chat, oldest first, ending with the user's new question. The server is stateless.
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((m) => m[m.length - 1].role === 'user', 'The last message must be from the user'),
  language: z.enum(['en', 'ta']).optional(),
});

/**
 * @openapi
 * /api/assistant/ask:
 *   post:
 *     tags: [Assistant]
 *     summary: Ask Professor a question about your own finances (answered from your WealthGuard data)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [user, assistant] }
 *                     content: { type: string }
 *               language: { type: string, enum: [en, ta] }
 *     responses:
 *       200:
 *         description: "{ answer, provider }"
 */
assistantRouter.post('/ask', async (req: Request, res: Response) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid question.', details: parsed.error.flatten() });

  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    // Drop leading assistant turns (e.g. the welcome bubble): conversations must start with the user.
    const history = parsed.data.messages.slice(parsed.data.messages.findIndex((m) => m.role === 'user'));
    res.json(await ProfessorService.ask(userId, user?.name, history, parsed.data.language));
  } catch (error) {
    console.error('Professor ask error:', error);
    res.status(503).json({ error: "Professor couldn't answer right now. Please try again in a moment." });
  }
});
