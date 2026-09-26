import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { generateWithFallback } from './gemini';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/** Image types Claude reads directly; anything else (e.g. HEIC) goes straight to Gemini. */
const CLAUDE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ClaudeImageType = (typeof CLAUDE_IMAGE_TYPES)[number];
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const openRouter = process.env.OPENROUTER_API_KEY ? new OpenAI({ 
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
}) : null;

export interface LoanExtractionResult {
  loanName?: string;
  principalAmount?: number;
  emiAmount?: number;
  emiDate?: string;
  endDate?: string;
  interestRate?: number;
  processingFee?: number;
  insuranceAmount?: number;
  bouncingCharge?: number;
  lenderAddress?: string;
  lenderContact?: string;
  lenderEmail?: string;
  appliedDate?: string;
  startDate?: string;
  tenureMonths?: number;
}

export interface ExpenseExtractionResult {
  vendorName?: string;
  amount?: number;
  date?: string;
  category?: string;
  transactionId?: string;
  upiId?: string;
}

export class OcrService {
  /**
   * Processes a document buffer (PDF or Image) and extracts structured data
   * based on the provided document type.
   */
  static async extractStructuredData(
    fileBuffer: Buffer,
    mimeType: string,
    documentType: 'LOAN' | 'EXPENSE'
  ): Promise<LoanExtractionResult | ExpenseExtractionResult> {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
      throw new Error('No AI provider API keys configured in the environment variables.');
    }

    try {
      let rawText = '';
      
      // If it's a PDF, we try to extract text first as it is cheaper and faster.
      if (mimeType === 'application/pdf') {
        try {
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(fileBuffer);
          rawText = pdfData.text;
        } catch (err) {
          console.warn('Failed to parse PDF text locally, falling back to Vision API if applicable.', err);
        }
      }

      const prompt = this.getPromptForType(documentType);
      const hasText = !!rawText && rawText.trim().length > 100;
      let responseText = '';
      let extractionError: Error | null = null;

      // ATTEMPT 1: Claude (reads photos and PDFs directly). If the key is expired, out of credit or
      // the call fails for any reason, we fall through to Gemini.
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          responseText = await this.extractWithClaude(rawText, hasText, fileBuffer, mimeType, prompt);
        } catch (err) {
          console.warn('Claude extraction failed, falling back to Gemini...', err instanceof Error ? err.message : err);
          extractionError = err instanceof Error ? err : new Error(String(err));
        }
      }

      // ATTEMPT 2: Gemini (tries several models, each with its own free quota)
      if (!responseText && process.env.GEMINI_API_KEY) {
        try {
          const response = await generateWithFallback(ai, {
            contents: hasText
              ? `Here is the text extracted from a financial document:\n\n${rawText}\n\n${prompt}`
              : [prompt, { inlineData: { mimeType, data: fileBuffer.toString('base64') } }],
            config: { responseMimeType: 'application/json' },
          });
          responseText = response.text || '';
          extractionError = null;
        } catch (err) {
          console.warn('Gemini extraction failed, attempting fallback...', err);
          extractionError = err instanceof Error ? err : new Error(String(err));
        }
      }

      // ATTEMPT 3: OpenAI Fallback
      if (!responseText && openai) {
        try {
          responseText = await this.extractWithOpenAI(openai, 'gpt-4o-mini', rawText, fileBuffer, mimeType, prompt, true);
          extractionError = null;
        } catch (err) {
          console.warn('OpenAI fallback failed, attempting OpenRouter...', err);
          extractionError = err instanceof Error ? err : new Error(String(err));
        }
      }

      // ATTEMPT 4: OpenRouter Fallback
      if (!responseText && openRouter) {
        try {
          responseText = await this.extractWithOpenAI(openRouter, 'google/gemini-2.5-flash', rawText, fileBuffer, mimeType, prompt, false);
          extractionError = null;
        } catch (err) {
          console.error('OpenRouter fallback failed.', err);
          extractionError = err instanceof Error ? err : new Error(String(err));
        }
      }

      if (!responseText) {
        throw extractionError || new Error('All configured AI providers failed to extract data.');
      }

      // Models sometimes wrap the JSON in markdown fences or a sentence; keep just the object.
      const start = responseText.indexOf('{');
      const end = responseText.lastIndexOf('}');
      return JSON.parse(start >= 0 && end > start ? responseText.slice(start, end + 1) : responseText);
    } catch (error) {
      console.error('Error in OCR extraction:', error);
      throw new Error(`Failed to extract structured data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async extractWithClaude(
    rawText: string,
    hasText: boolean,
    fileBuffer: Buffer,
    mimeType: string,
    prompt: string
  ): Promise<string> {
    const instruction = `${prompt}\nReturn only the JSON object, with no other text.`;
    let content: Anthropic.ContentBlockParam[];

    if (hasText) {
      content = [{ type: 'text', text: `Here is the text extracted from a financial document:\n\n${rawText}\n\n${instruction}` }];
    } else if (mimeType === 'application/pdf') {
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBuffer.toString('base64') } },
        { type: 'text', text: instruction },
      ];
    } else if ((CLAUDE_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
      content = [
        { type: 'image', source: { type: 'base64', media_type: mimeType as ClaudeImageType, data: fileBuffer.toString('base64') } },
        { type: 'text', text: instruction },
      ];
    } else {
      throw new Error(`Claude can't read ${mimeType} files`);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 60_000 });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
      max_tokens: 4000,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content }],
    });
    if (response.stop_reason === 'refusal') throw new Error('Claude declined to read this document');
    const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim();
    if (!text) throw new Error('Claude returned no text');
    return text;
  }

  private static async extractWithOpenAI(
    client: OpenAI, 
    model: string, 
    rawText: string, 
    fileBuffer: Buffer, 
    mimeType: string, 
    prompt: string,
    useJsonFormat: boolean
  ): Promise<string> {
    let messages: any[] = [];
    
    if (rawText && rawText.trim().length > 100) {
      messages = [
        { role: 'user', content: `Here is the text extracted from a financial document:\n\n${rawText}\n\n${prompt}` }
      ];
    } else {
      if (!mimeType.startsWith('image/')) {
        throw new Error('OpenAI/OpenRouter fallback does not natively support direct PDF vision. Please ensure Gemini is configured for PDFs.');
      }
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBuffer.toString('base64')}` } }
          ]
        }
      ];
    }

    const payload: any = { model, messages };
    if (useJsonFormat) {
      payload.response_format = { type: 'json_object' };
    }

    const completion = await client.chat.completions.create(payload);
    return completion.choices[0]?.message?.content || '';
  }

  private static getPromptForType(type: 'LOAN' | 'EXPENSE'): string {
    if (type === 'LOAN') {
      return `
Extract the following loan details from the document and return them as a strict JSON object:
- "loanName": Name of the loan or lender (string).
- "principalAmount": The total loan amount (number).
- "emiAmount": The monthly EMI amount (number).
- "emiDate": The day or date the EMI is due, often called First EMI Date (string, ISO format if possible).
- "startDate": The start date of the loan (string, ISO format if possible).
- "appliedDate": The date the loan was applied for or the transaction date (string, ISO format if possible).
- "endDate": The end date of the loan (string, ISO format if possible).
- "tenureMonths": The total duration or tenure of the loan in months (number).
- "interestRate": The annual interest rate percentage (number).
- "processingFee": Any processing fees charged (number).
- "insuranceAmount": Any insurance amount charged on the loan (number).
- "bouncingCharge": Any EMI bounce or cheque return charges (number).
- "lenderAddress": The full address of the lender/bank (string).
- "lenderContact": The phone number or contact details of the lender (string).
- "lenderEmail": The email address of the lender (string).
If a field is not found, omit it from the JSON.
      `;
    } else {
      return `
Extract the following expense or bill details from the document (e.g., Hotel bill, GPay screenshot) and return them as a strict JSON object:
- "vendorName": Name of the merchant, hotel, or recipient (string).
- "amount": The total amount paid (number).
- "date": The date of the transaction (string, ISO format if possible).
- "category": Categorize the expense (e.g., Food, Travel, Utilities, Shopping) (string).
- "transactionId": Any receipt number or transaction ID (string).
- "upiId": The UPI ID of the recipient if present (string).
If a field is not found, omit it from the JSON.
      `;
    }
  }
}
