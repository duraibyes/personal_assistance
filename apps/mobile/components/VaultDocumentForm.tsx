import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { DateInput } from './ui/DateInput';
import { Button } from './ui/Button';
import { ErrorBox, SectionTitle } from './ui/Bits';
import { ApiError } from '../lib/api';
import { COLORS, todayISO } from '../lib/config';
import { openDocument } from '../lib/documents';
import {
  categoryInfo,
  createVaultDocument,
  isImage,
  LocalFile,
  pickFile,
  pickPhoto,
  takePhoto,
  updateVaultDocument,
  VAULT_CATEGORIES,
  VaultCategory,
  VaultDocument,
} from '../lib/vault';

type Props = {
  initial?: VaultDocument;
  /** Pre-selects a category, e.g. when adding from a filtered list. */
  defaultCategory?: VaultCategory;
};

/** Add or edit a vault document: a photo / PDF plus what it is, when, and how much. */
export function VaultDocumentForm({ initial, defaultCategory }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<LocalFile | null>(null);
  const [f, setF] = useState({
    category: (initial?.category ?? defaultCategory ?? 'SCHOOL_FEES') as VaultCategory,
    title: initial?.title ?? '',
    amount: initial?.amount != null ? String(initial.amount) : '',
    recordDate: initial?.recordDate ? initial.recordDate.substring(0, 10) : initial ? '' : todayISO(),
    notes: initial?.notes ?? '',
  });
  const set = (key: keyof typeof f) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cat = categoryInfo(f.category);

  const choose = async (picker: () => Promise<LocalFile | null>) => {
    setServerError(null);
    try {
      const picked = await picker();
      if (picked) {
        setFile(picked);
        setErrors((prev) => ({ ...prev, file: '' }));
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not open the file');
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!initial && !file) next.file = 'Take a photo or choose a file';
    if (!f.title.trim()) next.title = 'Give it a name';
    if (f.amount.trim() && !(Number(f.amount) >= 0)) next.amount = 'Enter a valid amount';
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const onSubmit = async () => {
    setServerError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const fields = {
        title: f.title.trim(),
        category: f.category,
        amount: f.amount.trim() ? Number(f.amount) : null,
        recordDate: f.recordDate || null,
        notes: f.notes.trim() || null,
      };
      if (initial) await updateVaultDocument(initial.id, fields, file);
      else await createVaultDocument(fields, file!);
      router.back();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Failed to save document. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  // What to preview: a newly picked file wins over the stored one.
  const previewUri = file ? file.uri : initial?.storageKey;
  const previewIsImage = file ? isImage(file.mimeType) : isImage(initial?.mimeType);
  const previewName = file ? file.name : initial?.fileName;

  return (
    <>
      <ErrorBox message={serverError} />

      <Card>
        <SectionTitle>Photo or file</SectionTitle>
        {previewUri ? (
          <Pressable
            onPress={() => (file ? undefined : openDocument(initial))}
            style={styles.preview}
            disabled={!!file}
          >
            {previewIsImage ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.pdf}>
                <Ionicons name="document-text" size={40} color={COLORS.gold} />
                <Text style={styles.pdfName} numberOfLines={2}>{previewName}</Text>
              </View>
            )}
            {file ? <Text style={styles.newBadge}>New file — saved when you tap Save</Text> : null}
          </Pressable>
        ) : null}
        <View style={styles.pickRow}>
          <PickButton icon="camera-outline" label="Camera" onPress={() => choose(takePhoto)} />
          <PickButton icon="images-outline" label="Gallery" onPress={() => choose(pickPhoto)} />
          <PickButton icon="folder-open-outline" label="PDF / File" onPress={() => choose(pickFile)} />
        </View>
        {errors.file ? <Text style={styles.error}>{errors.file}</Text> : null}
        {initial && !file ? <Text style={styles.hint}>Pick a new photo or file only if you want to replace it.</Text> : null}
      </Card>

      <Card>
        <SectionTitle>Details</SectionTitle>
        <Select
          label="Type"
          value={f.category}
          options={VAULT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          onChange={(v) => setF((prev) => ({ ...prev, category: v as VaultCategory }))}
        />
        <Input label="Name" value={f.title} onChangeText={set('title')} placeholder={`e.g. ${cat.example}`} error={errors.title} />
        {cat.payment || f.amount ? (
          <Input
            label="Amount paid (₹, optional)"
            value={f.amount}
            onChangeText={set('amount')}
            keyboardType="decimal-pad"
            error={errors.amount}
          />
        ) : null}
        <DateInput
          label={cat.payment ? 'Paid on' : 'Issued on'}
          value={f.recordDate}
          onChange={set('recordDate')}
          optional
        />
        <Input
          label="Notes (optional)"
          value={f.notes}
          onChangeText={set('notes')}
          placeholder={cat.payment ? 'Receipt no., shop / school name, next due…' : 'Document number, valid till…'}
          multiline
        />
      </Card>

      <View style={styles.actions}>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} disabled={saving} style={{ flex: 1 }} />
        <Button title={initial ? 'Save changes' : 'Save document'} onPress={onSubmit} loading={saving} style={{ flex: 1 }} />
      </View>
    </>
  );
}

function PickButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pick, { opacity: pressed ? 0.75 : 1 }]}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
      <Text style={styles.pickText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  preview: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  previewImage: { width: '100%', height: 220, backgroundColor: COLORS.inputBg },
  pdf: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.inputBg, padding: 12 },
  pdfName: { color: COLORS.text, fontSize: 13, textAlign: 'center' },
  newBadge: { color: COLORS.success, fontSize: 12, fontWeight: '700', padding: 8, backgroundColor: 'rgba(52,211,153,0.1)' },
  pickRow: { flexDirection: 'row', gap: 10 },
  pick: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(47,123,255,0.5)',
    backgroundColor: 'rgba(47,123,255,0.08)',
  },
  pickText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  hint: { color: COLORS.muted, fontSize: 12 },
  error: { color: COLORS.danger, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
});
