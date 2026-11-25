import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from './api';
import { pickDocument } from './documents';

/** A document kept in the vault: ID cards, certificates, and proofs of payment. */
export type VaultDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  /** Public Cloudinary URL of the file. */
  storageKey: string;
  title: string;
  category: VaultCategory;
  amount: number | null;
  recordDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VaultCategory =
  | 'ID_PROOF'
  | 'EDUCATION'
  | 'SCHOOL_FEES'
  | 'VEHICLE_SERVICE'
  | 'ELECTRICITY_BILL'
  | 'INTERNET_BILL'
  | 'MEDICAL'
  | 'INSURANCE'
  | 'PROPERTY'
  | 'OTHER';

type CategoryInfo = {
  value: VaultCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  /** Payment proofs ask for an amount; ID cards and certificates do not. */
  payment: boolean;
  /** Example shown as the title placeholder. */
  example: string;
};

export const VAULT_CATEGORIES: CategoryInfo[] = [
  { value: 'ID_PROOF', label: 'ID proof', icon: 'card-outline', color: '#38bdf8', payment: false, example: 'Aadhaar card – Durai' },
  { value: 'EDUCATION', label: 'Education', icon: 'school-outline', color: '#a78bfa', payment: false, example: '10th mark sheet' },
  { value: 'SCHOOL_FEES', label: 'School fees', icon: 'library-outline', color: '#f5a524', payment: true, example: 'Term 2 school fees' },
  { value: 'VEHICLE_SERVICE', label: 'Vehicle service', icon: 'car-sport-outline', color: '#14b8a6', payment: true, example: 'Bike service – 10,000 km' },
  { value: 'ELECTRICITY_BILL', label: 'EB / Electricity', icon: 'flash-outline', color: '#facc15', payment: true, example: 'EB bill – Nov' },
  { value: 'INTERNET_BILL', label: 'Internet bill', icon: 'wifi-outline', color: '#2f7bff', payment: true, example: 'Internet bill – Nov' },
  { value: 'MEDICAL', label: 'Medical', icon: 'medkit-outline', color: '#fb7185', payment: true, example: 'Hospital bill' },
  { value: 'INSURANCE', label: 'Insurance', icon: 'shield-checkmark-outline', color: '#3ddc5f', payment: true, example: 'Car insurance policy' },
  { value: 'PROPERTY', label: 'Property', icon: 'home-outline', color: '#f97316', payment: false, example: 'House tax receipt' },
  { value: 'OTHER', label: 'Other', icon: 'document-text-outline', color: '#9fb0d4', payment: true, example: 'Warranty card' },
];

export function categoryInfo(value: string | null | undefined): CategoryInfo {
  return VAULT_CATEGORIES.find((c) => c.value === value) ?? VAULT_CATEGORIES[VAULT_CATEGORIES.length - 1];
}

/** A file chosen on the phone, ready to upload. */
export type LocalFile = { uri: string; name: string; mimeType: string };

/** Takes a photo with the camera. Resolves null if the user cancels; throws if permission is refused. */
export async function takePhoto(): Promise<LocalFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera permission is needed to take a photo. You can allow it in Settings.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
  return fromImageResult(result);
}

/** Picks a photo from the gallery. Resolves null if the user cancels. */
export async function pickPhoto(): Promise<LocalFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
  return fromImageResult(result);
}

/** Picks an image or PDF from files. Resolves null if the user cancels. */
export async function pickFile(): Promise<LocalFile | null> {
  const asset = await pickDocument();
  if (!asset) return null;
  return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType || guessMime(asset.name) };
}

function fromImageResult(result: ImagePicker.ImagePickerResult): LocalFile | null {
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  const name = a.fileName || a.uri.split('/').pop() || `photo_${Date.now()}.jpg`;
  return { uri: a.uri, name, mimeType: a.mimeType || guessMime(name) };
}

function guessMime(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export const isImage = (mimeType: string | null | undefined) => !!mimeType && mimeType.startsWith('image/');

export type VaultFields = {
  title: string;
  category: VaultCategory;
  amount: number | null;
  recordDate: string | null;
  notes: string | null;
};

function toFormData(fields: VaultFields, file: LocalFile | null) {
  const formData = new FormData();
  if (file) {
    formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  }
  formData.append('title', fields.title);
  formData.append('category', fields.category);
  formData.append('amount', fields.amount === null ? '' : String(fields.amount));
  formData.append('recordDate', fields.recordDate ?? '');
  formData.append('notes', fields.notes ?? '');
  return formData;
}

export function listVault(params: { category?: string; search?: string } = {}) {
  const q = new URLSearchParams();
  if (params.category) q.set('category', params.category);
  if (params.search) q.set('search', params.search);
  const qs = q.toString();
  return api<VaultDocument[]>(`/documents/vault${qs ? `?${qs}` : ''}`);
}

export function getVaultDocument(id: string) {
  return api<VaultDocument>(`/documents/vault/${id}`);
}

export function createVaultDocument(fields: VaultFields, file: LocalFile) {
  return api<VaultDocument>('/documents/vault', { method: 'POST', formData: toFormData(fields, file) });
}

/** Saves changed details; pass a file only to replace the stored one. */
export function updateVaultDocument(id: string, fields: VaultFields, file: LocalFile | null) {
  return api<VaultDocument>(`/documents/vault/${id}`, { method: 'PUT', formData: toFormData(fields, file) });
}

export function deleteVaultDocument(id: string) {
  return api<void>(`/documents/vault/${id}`, { method: 'DELETE' });
}
