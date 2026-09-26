import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { SpeechService } from '../services/speech.service';
import { ProfessorService, type ChatTurn } from '../services/professor/professor.service';

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

/** Stored turns sent back to the model as context for follow-up questions. */
const CONTEXT_TURNS = 12;
const HISTORY_LIMIT = 100;

const askSchema = z
  .object({
    /** The new question. History comes from the server, so the chat survives app restarts. */
    question: z.string().trim().min(1).max(4000).optional(),
    /** Older app versions (1.4.0) send the recent chat instead; still accepted. */
    messages: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }))
      .min(1)
      .max(20)
      .optional(),
    language: z.enum(['en', 'ta']).optional(),
    source: z.enum(['text', 'voice']).optional(),
  })
  .refine((b) => b.question || b.messages?.some((m) => m.role === 'user'), 'A question is required');

type StoredMessage = { id: string; role: string; content: string; source: string; createdAt: Date };
const toClient = (m: StoredMessage) => ({ id: m.id, role: m.role, content: m.content, source: m.source, createdAt: m.createdAt });

/**
 * @openapi
 * /api/assistant/ask:
 *   post:
 *     tags: [Assistant]
 *     summary: Ask Professor a question about your own finances (answered from your WealthGuard data)
 *     description: The question and answer are saved to the user's Professor history.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question: { type: string }
 *               language: { type: string, enum: [en, ta] }
 *               source: { type: string, enum: [text, voice] }
 *     responses:
 *       200:
 *         description: "{ answer, provider, messages: [question, answer] }"
 */
assistantRouter.post('/ask', async (req: Request, res: Response) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid question.', details: parsed.error.flatten() });

  try {
    const userId = req.user!.id;
    const body = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    // Built explicitly: Vercel's compile isn't strict, where zod types every field as optional.
    let history: ChatTurn[];
    if (body.question) {
      const recent = await prisma.professorMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: CONTEXT_TURNS,
        select: { role: true, content: true },
      });
      history = [
        ...recent.reverse().map((m): ChatTurn => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: body.question },
      ];
    } else {
      history = (body.messages ?? []).map((m): ChatTurn => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content ?? '') }));
    }
    // Conversations must start with the user (drops e.g. an old answer cut off at the context window).
    history = history.slice(history.findIndex((m) => m.role === 'user'));
    const question = history[history.length - 1].content;

    const result = await ProfessorService.ask(userId, user?.name, history, body.language);

    // Saved only once answered, so history never holds a question without its reply.
    const now = Date.now();
    const saved = await prisma.$transaction([
      prisma.professorMessage.create({
        data: { userId, role: 'user', content: question, source: body.source ?? 'text', createdAt: new Date(now) },
      }),
      prisma.professorMessage.create({
        data: { userId, role: 'assistant', content: result.answer, createdAt: new Date(now + 1) },
      }),
    ]);
    res.json({ ...result, messages: saved.map(toClient) });
  } catch (error) {
    console.error('Professor ask error:', error);
    res.status(503).json({ error: "Professor couldn't answer right now. Please try again in a moment." });
  }
});

/**
 * @openapi
 * /api/assistant/history:
 *   get:
 *     tags: [Assistant]
 *     summary: The user's saved Professor chat, oldest first (most recent 100 messages)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ messages: [{ id, role, content, source, createdAt }] }"
 *   delete:
 *     tags: [Assistant]
 *     summary: Clear the user's Professor chat history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Cleared
 */
assistantRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const rows = await prisma.professorMessage.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    res.json({ messages: rows.reverse().map(toClient) });
  } catch (error) {
    console.error('Professor history error:', error);
    res.status(500).json({ error: 'Could not load your chat history.' });
  }
});

assistantRouter.delete('/history', async (req: Request, res: Response) => {
  try {
    await prisma.professorMessage.deleteMany({ where: { userId: req.user!.id } });
    res.status(204).end();
  } catch (error) {
    console.error('Professor history clear error:', error);
    res.status(500).json({ error: 'Could not clear your chat history.' });
  }
});
