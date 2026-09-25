import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calculateEMI } from '@repo/shared';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { DateInput } from './ui/DateInput';
import { Button } from './ui/Button';
import { ErrorBox, IconButton, SectionTitle } from './ui/Bits';
import { DocumentUploader } from './DocumentUploader';
import { api, ApiError } from '../lib/api';
import { COLORS, formatDate, formatINR } from '../lib/config';
import { LOAN_TYPES } from '../lib/constants';
import { UploadedDocument, openDocument, pickDocument, uploadDocument } from '../lib/documents';

export type LoanRecord = {
  id: string;
  loanNumber?: string | null;
  name: string;
  lender: string;
  loanType: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  startDate: string;
  firstEmiDate: string;
  endDate?: string | null;
  bouncingCharge?: number | null;
  lenderAddress?: string | null;
  lenderContact?: string | null;
  lenderEmail?: string | null;
  status: string;
  documentId?: string | null;
  attachments?: UploadedDocument[];
};

/** Maps the loan-document extraction (see OcrService) onto form fields. */
type LoanExtraction = Partial<{
  loanName: string;
  lender: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiDate: string;
  startDate: string;
  emiAmount: number;
  bouncingCharge: number;
  lenderAddress: string;
  lenderContact: string;
  lenderEmail: string;
  endDate: string;
}>;

const day = (v?: string | null) => (v ? String(v).substring(0, 10) : '');
const num = (v?: number | null) => (v ? String(v) : '');

export function LoanForm({ initial }: { initial?: LoanRecord }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: initial?.name ?? '',
    loanNumber: initial?.loanNumber ?? '',
    lender: initial?.lender ?? '',
    loanType: initial?.loanType ?? 'PERSONAL',
    principalAmount: num(initial?.principalAmount),
    interestRate: num(initial?.interestRate),
    tenureMonths: num(initial?.tenureMonths),
    emiAmount: num(initial?.emiAmount),
    startDate: day(initial?.startDate),
    firstEmiDate: day(initial?.firstEmiDate),
    endDate: day(initial?.endDate),
    bouncingCharge: num(initial?.bouncingCharge),
    lenderContact: initial?.lenderContact ?? '',
    lenderEmail: initial?.lenderEmail ?? '',
    lenderAddress: initial?.lenderAddress ?? '',
  });
  const set = (key: keyof typeof f) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));

  const [documentId, setDocumentId] = useState<string | null>(initial?.documentId ?? null);
  const [attachments, setAttachments] = useState<UploadedDocument[]>(initial?.attachments ?? []);
  const [extracted, setExtracted] = useState<LoanExtraction | null>(null);
  const [tab, setTab] = useState<'upload' | 'library'>('upload');
  const [library, setLibrary] = useState<UploadedDocument[] | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const liveEmi = useMemo(() => {
    const p = Number(f.principalAmount);
    const r = Number(f.interestRate);
    const n = Number(f.tenureMonths);
    return p > 0 && r > 0 && n > 0 ? calculateEMI(p, r, n) : 0;
  }, [f.principalAmount, f.interestRate, f.tenureMonths]);

  const addAttachment = (doc: UploadedDocument) =>
    setAttachments((prev) => (prev.some((a) => a.id === doc.id) ? prev : [...prev, doc]));

  const fillExtracted = (data: LoanExtraction) => {
    setExtracted(data);
    setF((prev) => ({
      ...prev,
      name: data.loanName ?? prev.name,
      lender: data.lender ?? prev.lender,
      principalAmount: data.principalAmount ? String(data.principalAmount) : prev.principalAmount,
      interestRate: data.interestRate ? String(data.interestRate) : prev.interestRate,
      tenureMonths: data.tenureMonths ? String(data.tenureMonths) : prev.tenureMonths,
      firstEmiDate: data.emiDate ? day(data.emiDate) : prev.firstEmiDate,
      startDate: data.startDate ? day(data.startDate) : prev.startDate,
      emiAmount: data.emiAmount ? String(data.emiAmount) : prev.emiAmount,
      bouncingCharge: data.bouncingCharge ? String(data.bouncingCharge) : prev.bouncingCharge,
      lenderAddress: data.lenderAddress ?? prev.lenderAddress,
      lenderContact: data.lenderContact ?? prev.lenderContact,
      lenderEmail: data.lenderEmail ?? prev.lenderEmail,
      endDate: data.endDate ? day(data.endDate) : prev.endDate,
    }));
    setErrors({});
  };

  const openLibrary = async () => {
    setTab('library');
    setLibrary(null);
    try {
      setLibrary(await api<UploadedDocument[]>('/documents/library?type=LOAN'));
    } catch {
      setLibrary([]);
    }
  };

  const pickFromLibrary = (doc: UploadedDocument) => {
    setDocumentId(doc.id);
    addAttachment(doc);
    fillExtracted((doc.extractions?.[0]?.structuredData ?? {}) as LoanExtraction);
  };

  const attachFile = async () => {
    try {
      const file = await pickDocument();
      if (!file) return;
      setAttaching(true);
      addAttachment(await uploadDocument(file, 'LOAN', initial?.id || 'pending-loan'));
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAttaching(false);
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!f.name.trim()) next.name = 'Loan name is required';
    if (!f.lender.trim()) next.lender = 'Lender is required';
    if (!(Number(f.principalAmount) > 0)) next.principalAmount = 'Must be greater than 0';
    if (!(Number(f.interestRate) > 0)) next.interestRate = 'Must be greater than 0';
    if (!(Number(f.tenureMonths) > 0) || !Number.isInteger(Number(f.tenureMonths))) next.tenureMonths = 'Must be at least 1 month';
    if (!f.startDate) next.startDate = 'Start date is required';
    if (!f.firstEmiDate) next.firstEmiDate = 'First EMI date is required';
    if (!(Number(f.emiAmount) > 0) && !(liveEmi > 0)) next.emiAmount = 'Enter an EMI amount';
    if (f.lenderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.lenderEmail.trim())) next.lenderEmail = 'Invalid email';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setServerError(null);
    if (!validate()) return;
    setSaving(true);
    const tenure = Number(f.tenureMonths);
    try {
      const body = {
        name: f.name.trim(),
        loanNumber: f.loanNumber.trim() || null,
        lender: f.lender.trim(),
        loanType: f.loanType,
        principalAmount: Number(f.principalAmount),
        interestRate: Number(f.interestRate),
        tenureMonths: tenure,
        emiAmount: Number(f.emiAmount) || liveEmi,
        startDate: f.startDate,
        firstEmiDate: f.firstEmiDate,
        endDate: f.endDate || null,
        bouncingCharge: f.bouncingCharge ? Number(f.bouncingCharge) : null,
        lenderContact: f.lenderContact.trim() || null,
        lenderEmail: f.lenderEmail.trim() || null,
        lenderAddress: f.lenderAddress.trim() || null,
        documentId,
        attachmentIds: attachments.map((a) => a.id),
        numberOfEmis: tenure,
        status: initial?.status || 'ACTIVE',
        // A new loan starts with nothing paid; an edit leaves the EMI bookkeeping to the server.
        ...(initial
          ? {}
          : { remainingEmis: tenure, outstandingAmount: Number(f.principalAmount), nextEmiDate: f.firstEmiDate }),
      };
      if (initial) await api(`/loans/${initial.id}`, { method: 'PUT', body });
      else await api('/loans', { method: 'POST', body });
      router.back();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : `Failed to ${initial ? 'update' : 'create'} loan`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ErrorBox message={serverError} />

      <Card>
        <SectionTitle>AI data extractor</SectionTitle>
        <View style={styles.tabs}>
          {(['upload', 'library'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => (t === 'library' ? openLibrary() : setTab('upload'))}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'upload' ? 'Upload new' : 'From library'}</Text>
            </Pressable>
          ))}
        </View>
        {tab === 'upload' ? (
          <DocumentUploader
            entityId={initial?.id || 'pending-loan'}
            documentType="LOAN"
            onExtractionComplete={(result) => {
              if (result?.document?.id) {
                setDocumentId(result.document.id);
                addAttachment(result.document);
              }
              if (result?.extraction?.structuredData) fillExtracted(result.extraction.structuredData as LoanExtraction);
            }}
          />
        ) : library === null ? (
          <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 16 }} />
        ) : library.length === 0 ? (
          <Text style={styles.muted}>No unused loan documents.</Text>
        ) : (
          library.map((doc) => (
            <Pressable key={doc.id} onPress={() => pickFromLibrary(doc)} style={[styles.docRow, documentId === doc.id && styles.docRowActive]}>
              <Ionicons name="document-text-outline" size={20} color={documentId === doc.id ? COLORS.primary : COLORS.muted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.docName} numberOfLines={1}>{doc.fileName}</Text>
                <Text style={styles.muted}>{formatDate(doc.createdAt)}</Text>
              </View>
            </Pressable>
          ))
        )}
        {extracted ? (
          <View style={styles.extracted}>
            <Text style={styles.extractedTitle}>Extracted from document</Text>
            {Object.entries(extracted)
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([k, v]) => (
                <Text key={k} style={styles.muted}>
                  {k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}: <Text style={styles.value}>{String(v)}</Text>
                </Text>
              ))}
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Loan details</SectionTitle>
        <Input label="Loan name" value={f.name} onChangeText={set('name')} error={errors.name} placeholder="e.g. Home Loan" />
        <Input label="Loan number (optional)" value={f.loanNumber} onChangeText={set('loanNumber')} placeholder="e.g. LN-123456" />
        <Input label="Lender (bank)" value={f.lender} onChangeText={set('lender')} error={errors.lender} placeholder="HDFC Bank" />
        <Select label="Type" value={f.loanType} options={LOAN_TYPES} onChange={set('loanType')} />
        <Input label="Principal amount (₹)" value={f.principalAmount} onChangeText={set('principalAmount')} keyboardType="decimal-pad" error={errors.principalAmount} />
        <Input label="Interest rate (% p.a.)" value={f.interestRate} onChangeText={set('interestRate')} keyboardType="decimal-pad" error={errors.interestRate} />
        <Input label="Tenure (months)" value={f.tenureMonths} onChangeText={set('tenureMonths')} keyboardType="number-pad" error={errors.tenureMonths} />
        <Input
          label="EMI amount (₹)"
          value={f.emiAmount}
          onChangeText={set('emiAmount')}
          keyboardType="decimal-pad"
          placeholder={`Auto: ${formatINR(liveEmi)}`}
          error={errors.emiAmount}
        />
        <DateInput label="Start date" value={f.startDate} onChange={set('startDate')} error={errors.startDate} />
        <DateInput label="First EMI date" value={f.firstEmiDate} onChange={set('firstEmiDate')} error={errors.firstEmiDate} />
        <DateInput label="End date (optional)" value={f.endDate} onChange={set('endDate')} optional />
        <Input label="Bouncing charge (₹)" value={f.bouncingCharge} onChangeText={set('bouncingCharge')} keyboardType="decimal-pad" />
      </Card>

      <Card>
        <SectionTitle>Lender contact</SectionTitle>
        <Input label="Phone" value={f.lenderContact} onChangeText={set('lenderContact')} keyboardType="phone-pad" />
        <Input label="Email" value={f.lenderEmail} onChangeText={set('lenderEmail')} keyboardType="email-address" autoCapitalize="none" error={errors.lenderEmail} />
        <Input label="Address" value={f.lenderAddress} onChangeText={set('lenderAddress')} multiline />
      </Card>

      <Card>
        <SectionTitle>Attachments</SectionTitle>
        <Text style={styles.muted}>Loan agreements, NOCs, ID proofs — anything tied to this loan.</Text>
        {attachments.map((doc) => (
          <View key={doc.id} style={styles.docRow}>
            <Ionicons name="document-attach-outline" size={20} color={COLORS.muted} />
            <Text style={[styles.docName, { flex: 1 }]} numberOfLines={1}>{doc.fileName}</Text>
            <IconButton icon="eye-outline" tone="primary" onPress={() => openDocument(doc)} />
            <IconButton icon="trash-outline" tone="danger" onPress={() => setAttachments((prev) => prev.filter((a) => a.id !== doc.id))} />
          </View>
        ))}
        <Button title="Add attachment" icon="attach" variant="secondary" onPress={attachFile} loading={attaching} />
      </Card>

      <Card>
        <Text style={styles.muted}>Calculated EMI</Text>
        <Text style={styles.emi}>{formatINR(liveEmi)}</Text>
        {liveEmi > 0 ? (
          <Text style={styles.muted}>
            Total {formatINR(liveEmi * Number(f.tenureMonths))} · Interest {formatINR(liveEmi * Number(f.tenureMonths) - Number(f.principalAmount))}
          </Text>
        ) : null}
      </Card>

      <View style={styles.actions}>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} disabled={saving} style={{ flex: 1 }} />
        <Button title={initial ? 'Save changes' : 'Create loan'} onPress={onSubmit} loading={saving} style={{ flex: 1 }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(3,14,38,0.6)', borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: COLORS.primaryText },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docRowActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(47,123,255,0.12)' },
  docName: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  muted: { color: COLORS.muted, fontSize: 12 },
  value: { color: COLORS.text, fontWeight: '600' },
  extracted: {
    gap: 4,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(47,123,255,0.4)',
    backgroundColor: 'rgba(47,123,255,0.08)',
  },
  extractedTitle: { color: COLORS.text, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  emi: { color: COLORS.text, fontSize: 28, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10 },
});
