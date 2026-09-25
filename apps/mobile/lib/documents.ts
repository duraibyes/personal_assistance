import * as DocumentPicker from 'expo-document-picker';
import { Linking } from 'react-native';
import { api } from './api';

export type DocumentType = 'LOAN' | 'EXPENSE' | 'INCOME' | 'DOCUMENT';

export type UploadedDocument = {
  id: string;
  fileName: string;
  storageKey: string;
  createdAt?: string;
  extractions?: { structuredData?: Record<string, unknown> }[];
};

export type ExtractionResult = {
  document: UploadedDocument;
  extraction: { structuredData: Record<string, unknown> | null };
};

/** Opens the system picker for an image or PDF. Resolves null when the user cancels. */
export async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

export async function uploadDocument(
  file: DocumentPicker.DocumentPickerAsset,
  documentType: DocumentType,
  entityId: string
) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  } as unknown as Blob);
  formData.append('entityId', entityId);
  formData.append('documentType', documentType);
  return api<UploadedDocument>('/documents/upload', { method: 'POST', formData });
}

export function extractDocument(documentId: string) {
  return api<ExtractionResult>(`/documents/${documentId}/extract`, { method: 'POST' });
}

/** Documents are stored on Cloudinary; storageKey is a public URL the browser can open. */
export function openDocument(doc: { storageKey: string } | null | undefined) {
  if (doc?.storageKey) Linking.openURL(doc.storageKey).catch(() => undefined);
}
