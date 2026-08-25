import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

interface ExtractionResult {
  document: any;
  extraction: {
    structuredData: any;
  };
}

interface DocumentUploaderProps {
  userId: string;
  documentType: 'LOAN' | 'EXPENSE';
  onExtractionComplete: (result: ExtractionResult) => void;
}

export function DocumentUploader({ userId, documentType, onExtractionComplete }: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);
      formData.append('userId', userId);
      formData.append('documentType', documentType);

      // 1. Upload Document
      // Note: Replace with your actual backend IP instead of localhost for Android simulator (e.g., 10.0.2.2 or network IP)
      const uploadRes = await fetch('http://10.0.2.2:4000/api/documents/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload document');
      }
      
      const uploadedDoc = await uploadRes.json();

      // 2. Trigger Extraction
      const extractRes = await fetch(`http://10.0.2.2:4000/api/documents/${uploadedDoc.id}/extract`, {
        method: 'POST',
      });

      if (!extractRes.ok) {
        throw new Error('Failed to extract data');
      }

      const extractionResult = await extractRes.json();
      onExtractionComplete(extractionResult);

    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
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
  }
});
