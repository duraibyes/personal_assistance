import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from '@google/genai';

/**
 * Gemini models to try in order. Each model has its own free-tier quota, so when one is used up
 * (429) or retired (404) the next one usually still works. The "-latest" aliases follow Google's
 * current Flash models, so they don't disappear the way pinned versions (e.g. 2.5-flash-lite) do.
 * Override with GEMINI_MODELS="model-a,model-b".
 */
export function geminiModels(): string[] {
  const configured = process.env.GEMINI_MODELS || process.env.GEMINI_MODEL;
  if (configured) return configured.split(',').map((m) => m.trim()).filter(Boolean);
  return ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash'];
}

const RETRY_NEXT_MODEL = new Set([404, 429, 500, 503]);
const CALL_TIMEOUT_MS = 30_000;

/**
 * generateContent that moves on to the next model when one is out of quota, retired or down.
 * Each attempt gets its own timeout, so a slow first model doesn't cancel the ones after it.
 */
export async function generateWithFallback(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, 'model'>
): Promise<GenerateContentResponse> {
  let lastError: unknown;
  for (const model of geminiModels()) {
    try {
      return await ai.models.generateContent({
        ...params,
        model,
        config: { ...params.config, abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS) },
      });
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const timedOut = (err as { name?: string })?.name === 'TimeoutError' || (err as { name?: string })?.name === 'AbortError';
      if (!timedOut && (!status || !RETRY_NEXT_MODEL.has(status))) throw err;
      console.warn(`Gemini ${model} failed (${timedOut ? 'timeout' : status}), trying the next model.`);
    }
  }
  throw lastError;
}
