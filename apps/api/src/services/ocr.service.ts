import { GoogleGenAI } from '@google/genai';

import OpenAI from 'openai';

// Initialize the Gemini client. We will require GEMINI_API_KEY in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
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
    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
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
      let responseText = '';
      let extractionError: Error | null = null;

      // ATTEMPT 1: Gemini
      if (process.env.GEMINI_API_KEY) {
        try {
          if (rawText && rawText.trim().length > 100) {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Here is the text extracted from a financial document:\n\n${rawText}\n\n${prompt}`,
              config: { responseMimeType: 'application/json' }
            });
            responseText = response.text || '';
          } else {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [
                prompt,
                { inlineData: { mimeType, data: fileBuffer.toString('base64') } }
              ],
              config: { responseMimeType: 'application/json' }
            });
            responseText = response.text || '';
          }
        } catch (err) {
          console.warn('Gemini extraction failed, attempting fallback...', err);
          extractionError = err instanceof Error ? err : new Error(String(err));
        }
      }

      // ATTEMPT 2: OpenAI Fallback
      if (!responseText && openai) {
        try {
          responseText = await this.extractWithOpenAI(openai, 'gpt-4o-mini', rawText, fileBuffer, mimeType, prompt, true);
          extractionError = null;
        } catch (err) {
          console.warn('OpenAI fallback failed, attempting OpenRouter...', err);
          extractionError = err instanceof Error ? err : new Error(String(err));
        }
      }

      // ATTEMPT 3: OpenRouter Fallback
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

      // Sometimes models wrap JSON in markdown fences
      responseText = responseText.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error in OCR extraction:', error);
      throw new Error(`Failed to extract structured data: ${error instanceof Error ? error.message : String(error)}`);
    }
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
- "emiDate": The day or date the EMI is due (string, ISO format if possible).
- "endDate": The end date of the loan (string, ISO format if possible).
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
