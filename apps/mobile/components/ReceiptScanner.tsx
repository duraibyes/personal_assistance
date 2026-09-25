import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DocumentUploader } from './DocumentUploader';
import { COLORS } from '../lib/config';
import { EXTRACTION_LABELS, ExpenseExtraction } from '../lib/receipt';

type Props = {
  entityId?: string;
  attached: boolean;
  onExtracted: (data: ExpenseExtraction, documentId: string | null) => void;
};

/** Upload a receipt, let the AI read it, and show what was pulled out. */
export function ReceiptScanner({ entityId, attached, onExtracted }: Props) {
  const [extracted, setExtracted] = useState<ExpenseExtraction | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const entries = extracted
    ? (Object.keys(EXTRACTION_LABELS) as (keyof ExpenseExtraction)[]).filter((key) => {
        const value = extracted[key];
        return value !== null && value !== undefined && value !== '';
      })
    : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        Upload a bill, receipt or payment screenshot. The fields below are filled in for you — review them before saving.
      </Text>
      <DocumentUploader
        entityId={entityId || 'pending-expense'}
        documentType="EXPENSE"
        onExtractionComplete={(result) => {
          const data = (result?.extraction?.structuredData || {}) as ExpenseExtraction;
          const doc = result?.document;
          setExtracted(data);
          setFileName(typeof doc?.fileName === 'string' ? doc.fileName : null);
          onExtracted(data, doc?.id ?? null);
        }}
      />

      {extracted ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>
            Extracted from document{fileName ? ` · ${fileName}` : ''}
          </Text>
          {entries.length ? (
            <View style={styles.grid}>
              {entries.map((key) => (
                <View key={key} style={styles.cell}>
                  <Text style={styles.cellLabel}>{EXTRACTION_LABELS[key].toUpperCase()}</Text>
                  <Text style={styles.cellValue}>{String(extracted[key])}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.hint}>
              Nothing could be read from this file. It is still attached — fill the fields in manually.
            </Text>
          )}
        </View>
      ) : null}

      {attached ? <Text style={styles.badge}>📎 Receipt attached</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  hint: { color: COLORS.muted, fontSize: 13 },
  result: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  resultTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  cell: { width: '50%', paddingRight: 8 },
  cellLabel: { color: COLORS.muted, fontSize: 10, letterSpacing: 0.5 },
  cellValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  badge: { color: COLORS.success, fontSize: 12, fontWeight: '600' },
});
