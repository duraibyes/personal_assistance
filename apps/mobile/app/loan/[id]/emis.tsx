import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components/ui/Screen';
import { Card, EmptyState } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DateInput } from '../../../components/ui/DateInput';
import { Sheet } from '../../../components/ui/Sheet';
import { Badge, ErrorBox, ProgressBar, Tone } from '../../../components/ui/Bits';
import { api, ApiError } from '../../../lib/api';
import { COLORS, formatDate, formatINR, todayISO } from '../../../lib/config';
import { openDocument, pickDocument, uploadDocument } from '../../../lib/documents';

type Emi = {
  id: string;
  emiNumber: number;
  dueDate: string;
  dueAmount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  paidAmount: number | null;
  paymentDate: string | null;
  description: string | null;
  documentId: string | null;
  document: { id: string; storageKey: string; fileName: string } | null;
};

type Loan = {
  id: string;
  name: string;
  lender: string;
  numberOfEmis: number;
  status: string;
  foreclosureDate?: string | null;
  foreclosureAmount?: number | null;
};

type BulkMode = 'ALL' | 'UNTIL_CURRENT_MONTH' | 'FORECLOSURE';

const STATUS: Record<Emi['status'], { tone: Tone; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: { tone: 'neutral', icon: 'time-outline' },
  PAID: { tone: 'success', icon: 'checkmark-circle' },
  OVERDUE: { tone: 'danger', icon: 'alert-circle' },
  PARTIAL: { tone: 'warning', icon: 'ellipse-outline' },
};

const FILTERS = ['ALL', 'PENDING', 'OVERDUE', 'PAID'] as const;

export default function LoanEmisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [emis, setEmis] = useState<Emi[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');

  // Per-installment edit
  const [active, setActive] = useState<Emi | null>(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<DocumentPickerAsset | null>(null);
  const [saving, setSaving] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [editError, setEditError] = useState<string | null>(null);

  // Bulk update
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode>('UNTIL_CURRENT_MONTH');
  const [bulkDescription, setBulkDescription] = useState('');
  const [foreclosureAmount, setForeclosureAmount] = useState('');
  const [foreclosureDate, setForeclosureDate] = useState(todayISO());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const res = await api<{ loan: Loan; emis: Emi[] }>(`/loans/${id}/emis`);
        setLoan(res.loan);
        setEmis(res.emis);
      } catch {
        setLoan(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const paidCount = emis.filter((e) => e.status === 'PAID').length;
  const unpaidCount = emis.length - paidCount;
  const totalPaid = emis.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  const visible = filter === 'ALL' ? emis : emis.filter((e) => e.status === filter || (filter === 'PENDING' && e.status === 'PARTIAL'));

  const openEdit = (emi: Emi) => {
    setActive(emi);
    setPaymentDate(emi.paymentDate ? emi.paymentDate.substring(0, 10) : todayISO());
    setPaidAmount(String(emi.paidAmount ?? emi.dueAmount));
    setDescription(emi.description || '');
    setFile(null);
    setEditError(null);
  };

  const chooseReceipt = async () => {
    const picked = await pickDocument();
    if (picked) setFile(picked);
  };

  const savePayment = async () => {
    if (!active) return;
    if (!paymentDate) return setEditError('Payment date is required');
    if (!(Number(paidAmount) > 0)) return setEditError('Amount must be greater than 0');
    setEditError(null);
    try {
      let documentId = active.documentId;
      if (file) {
        setSaving('uploading');
        documentId = (await uploadDocument(file, 'LOAN', id)).id;
      }
      setSaving('saving');
      await api(`/loans/${id}/emis/${active.id}`, {
        method: 'PATCH',
        body: { paidAmount: Number(paidAmount), paymentDate, description: description.trim() || null, documentId },
      });
      setActive(null);
      await load(true);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update payment');
    } finally {
      setSaving('idle');
    }
  };

  const markUnpaid = async () => {
    if (!active) return;
    setSaving('saving');
    try {
      await api(`/loans/${id}/emis/${active.id}`, {
        method: 'PATCH',
        body: { status: 'PENDING', paidAmount: null, paymentDate: null },
      });
      setActive(null);
      await load(true);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to update payment');
    } finally {
      setSaving('idle');
    }
  };

  const openBulk = () => {
    setBulkMode('UNTIL_CURRENT_MONTH');
    setBulkDescription('');
    setForeclosureAmount('');
    setForeclosureDate(todayISO());
    setBulkError(null);
    setBulkOpen(true);
  };

  const applyBulk = async () => {
    const amount = Number(foreclosureAmount);
    if (bulkMode === 'FORECLOSURE' && !(amount > 0)) return setBulkError('Enter a foreclosure amount greater than 0');
    setBulkError(null);
    setBulkSaving(true);
    try {
      await api(`/loans/${id}/emis/bulk-pay`, {
        method: 'POST',
        body: {
          mode: bulkMode,
          description: bulkDescription.trim() || null,
          ...(bulkMode === 'FORECLOSURE' ? { foreclosureAmount: amount, foreclosureDate } : {}),
        },
      });
      setBulkOpen(false);
      await load(true);
    } catch (err) {
      setBulkError(err instanceof ApiError ? err.message : 'Failed to update payments');
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <Screen
      title="EMI Schedule"
      subtitle={loan ? `${loan.name} · ${loan.lender}` : undefined}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      back
    >
      {!loan ? (
        <EmptyState title="Loan not found" hint="It may have been deleted." />
      ) : (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>{paidCount} of {emis.length} paid</Text>
              <Text style={styles.muted}>Paid so far {formatINR(totalPaid)}</Text>
            </View>
            <ProgressBar value={emis.length ? paidCount / emis.length : 0} />
            {loan.status === 'FORECLOSED' ? (
              <Badge
                label={`FORECLOSED${loan.foreclosureDate ? ` · ${formatDate(loan.foreclosureDate)}` : ''}${loan.foreclosureAmount != null ? ` · ${formatINR(loan.foreclosureAmount)}` : ''}`}
                tone="warning"
                icon="shield-checkmark"
              />
            ) : null}
            <Button title="Update payment" icon="wallet-outline" onPress={openBulk} disabled={unpaidCount === 0} />
          </Card>

          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
                <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f === 'ALL' ? 'All' : f[0] + f.slice(1).toLowerCase()}</Text>
              </Pressable>
            ))}
          </View>

          {visible.length === 0 ? (
            <EmptyState title="Nothing here" hint="No installments match this filter." />
          ) : (
            visible.map((emi) => {
              const s = STATUS[emi.status] ?? STATUS.PENDING;
              const paid = emi.status === 'PAID' || emi.status === 'PARTIAL';
              return (
                <Card key={emi.id} onPress={() => openEdit(emi)}>
                  <View style={styles.rowBetween}>
                    <View>
                      <Text style={styles.emiTitle}>EMI #{emi.emiNumber}</Text>
                      <Text style={styles.muted}>Due {formatDate(emi.dueDate)}</Text>
                    </View>
                    <Badge label={emi.status} tone={s.tone} icon={s.icon} />
                  </View>
                  <Text style={styles.amount}>{formatINR(emi.dueAmount)}</Text>
                  {paid ? (
                    <Text style={styles.muted}>
                      Paid {formatINR(emi.paidAmount)} on {formatDate(emi.paymentDate)}
                      {emi.description ? ` · ${emi.description}` : ''}
                    </Text>
                  ) : null}
                  <View style={styles.rowBetween}>
                    {emi.document ? (
                      <Pressable onPress={() => openDocument(emi.document)} style={styles.receipt} hitSlop={6}>
                        <Ionicons name="attach" size={14} color={COLORS.primary} />
                        <Text style={styles.receiptText}>View receipt</Text>
                      </Pressable>
                    ) : (
                      <View />
                    )}
                    <Text style={styles.editHint}>
                      <Ionicons name="create-outline" size={12} color={COLORS.muted} /> {paid ? 'Edit' : 'Record payment'}
                    </Text>
                  </View>
                </Card>
              );
            })
          )}
        </>
      )}

      <Sheet visible={!!active} title={`EMI #${active?.emiNumber ?? ''} — payment`} onClose={() => setActive(null)} busy={saving !== 'idle'}>
        <ErrorBox message={editError} />
        <Text style={styles.muted}>Due {formatDate(active?.dueDate)} · {formatINR(active?.dueAmount)}</Text>
        <DateInput label="Payment date" value={paymentDate} onChange={setPaymentDate} />
        <Input label="Amount paid (₹)" value={paidAmount} onChangeText={setPaidAmount} keyboardType="decimal-pad" />
        <Input label="Description (optional)" value={description} onChangeText={setDescription} placeholder="e.g. Paid via UPI" />
        <View style={styles.receiptBox}>
          <Text style={styles.label}>Receipt (optional)</Text>
          {file ? (
            <Text style={styles.value} numberOfLines={1}>📎 {file.name}</Text>
          ) : active?.document ? (
            <Pressable onPress={() => openDocument(active.document)}>
              <Text style={[styles.value, { color: COLORS.primary }]} numberOfLines={1}>📎 {active.document.fileName} (tap to view)</Text>
            </Pressable>
          ) : (
            <Text style={styles.muted}>No receipt attached.</Text>
          )}
          <Button
            title={file || active?.document ? 'Replace receipt' : 'Attach receipt'}
            icon="cloud-upload-outline"
            variant="secondary"
            size="sm"
            onPress={chooseReceipt}
          />
        </View>
        <Button
          title={saving === 'uploading' ? 'Uploading…' : 'Save payment'}
          onPress={savePayment}
          loading={saving !== 'idle'}
        />
        {active && (active.status === 'PAID' || active.status === 'PARTIAL') ? (
          <Button title="Mark as unpaid" variant="secondary" onPress={markUnpaid} disabled={saving !== 'idle'} />
        ) : null}
      </Sheet>

      <Sheet visible={bulkOpen} title="Update payment" onClose={() => setBulkOpen(false)} busy={bulkSaving}>
        <ErrorBox message={bulkError} />
        <ModeOption
          selected={bulkMode === 'ALL'}
          onPress={() => setBulkMode('ALL')}
          title="Mark all as paid (using due date)"
          hint="Every installment for the full tenure is marked Paid, each on its own due date."
        />
        <ModeOption
          selected={bulkMode === 'UNTIL_CURRENT_MONTH'}
          onPress={() => setBulkMode('UNTIL_CURRENT_MONTH')}
          title="Mark as paid until current month"
          hint="Only installments due today or earlier are marked Paid."
        />
        <ModeOption
          selected={bulkMode === 'FORECLOSURE'}
          onPress={() => setBulkMode('FORECLOSURE')}
          title="Foreclosure (close the loan early)"
          hint={`Settle with one payment. All ${unpaidCount} remaining installment${unpaidCount === 1 ? '' : 's'} are marked Paid and the loan is marked Foreclosed.`}
        />
        {bulkMode === 'FORECLOSURE' ? (
          <>
            <Input
              label="Foreclosure amount (₹)"
              value={foreclosureAmount}
              onChangeText={setForeclosureAmount}
              keyboardType="decimal-pad"
              placeholder="Total settlement paid to the lender"
            />
            <DateInput label="Foreclosure date" value={foreclosureDate} onChange={setForeclosureDate} />
          </>
        ) : null}
        <Input
          label="Description (optional)"
          value={bulkDescription}
          onChangeText={setBulkDescription}
          placeholder={bulkMode === 'FORECLOSURE' ? 'e.g. Foreclosed via NEFT' : 'Applied to every installment marked paid'}
        />
        <Button title="Apply" onPress={applyBulk} loading={bulkSaving} />
      </Sheet>
    </Screen>
  );
}

function ModeOption({ selected, onPress, title, hint }: { selected: boolean; onPress: () => void; title: string; hint: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.mode, selected && styles.modeActive]}>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? COLORS.primary : COLORS.muted} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.muted}>{hint}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  muted: { color: COLORS.muted, fontSize: 12 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  value: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  emiTitle: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
  amount: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  receiptText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  editHint: { color: COLORS.muted, fontSize: 12 },
  filters: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: COLORS.primaryText },
  receiptBox: { gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  mode: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  modeActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(47,123,255,0.1)' },
  modeTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
});
