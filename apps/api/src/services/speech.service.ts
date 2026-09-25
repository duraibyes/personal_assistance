import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface TranscriptionResult {
  /** Language the speaker actually used. "mixed" covers Tamil–English code-switching (Tanglish). */
  language: 'ta' | 'en' | 'mixed' | 'other';
  /** Verbatim transcript in the spoken script. */
  original: string;
  english: string;
  /** Tamil script (not transliteration). */
  tamil: string;
}

const PROMPT = `You are a transcription and translation engine for an Indian personal-finance app.
Listen to the audio. The speaker uses Tamil, English, or a mix of both.

Return ONLY a JSON object with these keys:
- "language": "ta" if mostly Tamil, "en" if mostly English, "mixed" if both are used heavily, "other" otherwise.
- "original": exact transcript of what was said, Tamil words in Tamil script, English words in English.
- "english": natural English translation of the whole utterance.
- "tamil": natural Tamil translation of the whole utterance, in Tamil script.

Keep numbers, amounts (₹), names, bank names and dates exactly as spoken.
If the audio has no speech, return empty strings for original, english and tamil.`;

export class SpeechService {
  static async transcribe(audio: Buffer, mimeType: string): Promise<TranscriptionResult> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Voice transcription is not configured (GEMINI_API_KEY missing).');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [PROMPT, { inlineData: { mimeType, data: audio.toString('base64') } }],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      language: ['ta', 'en', 'mixed'].includes(parsed.language) ? parsed.language : 'other',
      original: String(parsed.original ?? ''),
      english: String(parsed.english ?? ''),
      tamil: String(parsed.tamil ?? ''),
    };
  }
}
