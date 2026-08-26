import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

interface ExtractionResult {
  document: { id: string; [key: string]: unknown };
  extraction: {
    structuredData: unknown;
  };
}

interface DocumentUploaderProps {
  entityId: string;
  documentType: 'LOAN' | 'EXPENSE';
  token: string;
  onExtractionComplete: (result: ExtractionResult) => void;
}

export function DocumentUploader({
  entityId,
  documentType,
  token,
  onExtractionComplete,
}: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as unknown as Blob);
      formData.append('entityId', entityId);
      formData.append('documentType', documentType);

      const uploadRes = await fetch(`${apiBase}/documents/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload document');
      }

      const uploadedDoc = await uploadRes.json();

      const extractRes = await fetch(`${apiBase}/documents/${uploadedDoc.id}/extract`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!extractRes.ok) {
        throw new Error('Failed to extract data');
      }

      const extractionResult = await extractRes.json();
      onExtractionComplete(extractionResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload {documentType === 'LOAN' ? 'Loan Document' : 'Receipt'}</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, isUploading && styles.buttonDisabled]}
        onPress={handlePickAndUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Select Document & Auto-Fill</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
