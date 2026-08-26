import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client. We will require GEMINI_API_KEY in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface LoanExtractionResult {
  loanName?: string;
  principalAmount?: number;
  emiAmount?: number;
  emiDate?: string;
  endDate?: string;
  interestRate?: number;
  processingFee?: number;
  insuranceAmount?: number;
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
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in the environment variables.');
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

      // If we don't have text (e.g. image or scanned PDF), we can pass the file directly to Gemini
      // For simplicity in this implementation, if we have text we use it, otherwise we use the image directly.
      const prompt = this.getPromptForType(documentType);
      
      let response;
      if (rawText && rawText.trim().length > 100) {
        // Text-based extraction
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Here is the text extracted from a financial document:\n\n${rawText}\n\n${prompt}`,
          config: {
            responseMimeType: 'application/json',
          }
        });
      } else {
        // Vision-based extraction for images (or un-parsable PDFs)
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            prompt,
            { inlineData: { mimeType, data: fileBuffer.toString('base64') } }
          ],
          config: {
            responseMimeType: 'application/json',
          }
        });
      }

      const responseText = response.text || '{}';
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error in OCR extraction:', error);
      throw new Error('Failed to extract structured data from document.');
    }
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
