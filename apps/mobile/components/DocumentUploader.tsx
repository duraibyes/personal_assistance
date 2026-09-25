import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { COLORS } from '../lib/config';
import { DocumentType, ExtractionResult, extractDocument, pickDocument, uploadDocument } from '../lib/documents';

interface DocumentUploaderProps {
  entityId: string;
  documentType: DocumentType;
  onExtractionComplete: (result: ExtractionResult) => void;
}

/** Pick a file, upload it, and run AI extraction on it. */
export function DocumentUploader({ entityId, documentType, onExtractionComplete }: DocumentUploaderProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'reading'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handlePickAndUpload = async () => {
    setError(null);
    try {
      const file = await pickDocument();
      if (!file) return;
      setStatus('uploading');
      const uploaded = await uploadDocument(file, documentType, entityId);
      setStatus('reading');
      onExtractionComplete(await extractDocument(uploaded.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload.');
    } finally {
      setStatus('idle');
    }
  };

  const busy = status !== 'idle';

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button
        title={
          status === 'uploading'
            ? 'Uploading…'
            : status === 'reading'
              ? 'Reading document…'
              : `Select ${documentType === 'LOAN' ? 'loan document' : 'receipt'} & auto-fill`
        }
        icon="sparkles-outline"
        onPress={handlePickAndUpload}
        loading={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  errorText: { color: COLORS.danger, fontSize: 13 },
});
