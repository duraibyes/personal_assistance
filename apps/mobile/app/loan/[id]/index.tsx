import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { generateAmortizationSchedule } from '@repo/shared';
import { Screen } from '../../../components/ui/Screen';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Badge, IconButton, LOAN_STATUS_TONE, ProgressBar, SectionTitle, StatTile } from '../../../components/ui/Bits';
import { LoanRecord } from '../../../components/LoanForm';
import { api } from '../../../lib/api';
import { COLORS, formatDate, formatINR } from '../../../lib/config';
import { labelFor, LOAN_TYPES } from '../../../lib/constants';
import { openDocument } from '../../../lib/documents';

type Loan = LoanRecord & {
  numberOfEmis: number;
  paidEmis: number;
  outstandingAmount: number;
  nextEmiDate: string;
  foreclosureDate?: string | null;
  foreclosureAmount?: number | null;
};

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api<Loan>(`/loans/${id}`)
        .then(setLoan)
        .catch(() => setLoan(null))
        .finally(() => setLoading(false));
    }, [id])
  );

  const schedule = useMemo(
    () =>
      loan
        ? generateAmortizationSchedule(loan.principalAmount, loan.interestRate, loan.numberOfEmis, new Date(loan.nextEmiDate))
        : [],
    [loan]
  );
  const totalInterest = schedule.reduce((sum, row) => sum + row.interestComponent, 0);

  const onDelete = async () => {
    setDeleting(true);
    try {
      await api(`/loans/${id}`, { method: 'DELETE' });
      router.back();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Screen title={loan?.name || 'Loan'} subtitle={loan ? `${loan.lender} · ${labelFor(LOAN_TYPES, loan.loanType)}` : undefined} loading={loading} back>
      {!loan ? (
        <Text style={styles.muted}>Loan not found</Text>
      ) : (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <Badge label={loan.status} tone={LOAN_STATUS_TONE[loan.status] ?? 'neutral'} />
              <Text style={styles.muted}>{loan.paidEmis} / {loan.numberOfEmis} EMIs paid</Text>
            </View>
            <Text style={styles.big}>{formatINR(loan.emiAmount)} <Text style={styles.muted}>/ month</Text></Text>
            <ProgressBar value={loan.paidEmis / loan.numberOfEmis} />
            <Text style={styles.muted}>Next EMI {formatDate(loan.nextEmiDate)}</Text>
          </Card>

          {loan.status === 'FORECLOSED' ? (
            <View style={styles.banner}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Loan foreclosed</Text>
                <Text style={styles.muted}>
                  {loan.foreclosureDate ? `Closed on ${formatDate(loan.foreclosureDate)}` : ''}
                  {loan.foreclosureAmount != null ? ` · Settled ${formatINR(loan.foreclosureAmount)}` : ''}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button title="EMI / Payments" icon="receipt-outline" onPress={() => router.push(`/loan/${id}/emis`)} style={{ flex: 1 }} />
          </View>
          <View style={styles.actions}>
            <Button title="Edit" icon="create-outline" variant="secondary" onPress={() => router.push(`/loan/${id}/edit`)} style={{ flex: 1 }} />
            <Button title="Delete" icon="trash-outline" variant="danger" onPress={() => setConfirmDelete(true)} style={{ flex: 1 }} />
          </View>

          <View style={styles.grid}>
            <StatTile label="Principal" value={formatINR(loan.principalAmount)} icon="cash-outline" />
            <StatTile label="Interest rate" value={`${loan.interestRate}% p.a.`} icon="trending-up-outline" tone="warning" />
            <StatTile label="Outstanding" value={formatINR(loan.outstandingAmount)} icon="hourglass-outline" tone="danger" />
            <StatTile label="Total payable" value={formatINR(loan.principalAmount + totalInterest)} icon="calculator-outline" tone="success" />
          </View>

          <Card>
            <SectionTitle>Details</SectionTitle>
            {loan.loanNumber ? <Row label="Loan number" value={loan.loanNumber} /> : null}
            <Row label="Start date" value={formatDate(loan.startDate)} />
            <Row label="First EMI" value={formatDate(loan.firstEmiDate)} />
            {loan.endDate ? <Row label="End date" value={formatDate(loan.endDate)} /> : null}
            {loan.bouncingCharge ? <Row label="Bouncing charge" value={formatINR(loan.bouncingCharge)} /> : null}
          </Card>

          {loan.lenderContact || loan.lenderEmail || loan.lenderAddress ? (
            <Card>
              <SectionTitle>Lender</SectionTitle>
              {loan.lenderContact ? (
                <Pressable onPress={() => Linking.openURL(`tel:${loan.lenderContact}`)}>
                  <Row label="Phone" value={loan.lenderContact} link />
                </Pressable>
              ) : null}
              {loan.lenderEmail ? (
                <Pressable onPress={() => Linking.openURL(`mailto:${loan.lenderEmail}`)}>
                  <Row label="Email" value={loan.lenderEmail} link />
                </Pressable>
              ) : null}
              {loan.lenderAddress ? <Text style={styles.muted}>{loan.lenderAddress}</Text> : null}
            </Card>
          ) : null}

          {loan.attachments?.length ? (
            <Card>
              <SectionTitle>Attachments</SectionTitle>
              {loan.attachments.map((doc) => (
                <View key={doc.id} style={styles.docRow}>
                  <Ionicons name="document-attach-outline" size={18} color={COLORS.muted} />
                  <Text style={styles.docName} numberOfLines={1}>{doc.fileName}</Text>
                  <IconButton icon="eye-outline" tone="primary" onPress={() => openDocument(doc)} />
                </View>
              ))}
            </Card>
          ) : null}

          <Card>
            <Pressable onPress={() => setShowSchedule((v) => !v)} style={styles.rowBetween}>
              <Text style={styles.section}>Amortization schedule</Text>
              <Ionicons name={showSchedule ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.muted} />
            </Pressable>
            {showSchedule ? (
              <>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.th, { width: 30 }]}>#</Text>
                  <Text style={[styles.th, { flex: 1.2 }]}>Date</Text>
                  <Text style={[styles.th, styles.num]}>Principal</Text>
                  <Text style={[styles.th, styles.num]}>Interest</Text>
                  <Text style={[styles.th, styles.num]}>Balance</Text>
                </View>
                {schedule.map((row) => (
                  <View key={row.month} style={styles.tableRow}>
                    <Text style={[styles.td, { width: 30 }]}>{row.month}</Text>
                    <Text style={[styles.td, { flex: 1.2 }]}>{formatDate(row.paymentDate)}</Text>
                    <Text style={[styles.td, styles.num, { color: COLORS.success }]}>{Math.round(row.principalComponent).toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, styles.num, { color: '#fb7185' }]}>{Math.round(row.interestComponent).toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, styles.num]}>{Math.round(row.outstandingBalance).toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.muted}>Tap to see the month-by-month principal and interest split.</Text>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete loan?"
        description={`"${loan?.name}" will be moved to the trash.`}
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
    </Screen>
  );
}

function Row({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.value, link && { color: COLORS.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { color: COLORS.text, fontSize: 26, fontWeight: '900' },
  muted: { color: COLORS.muted, fontSize: 12 },
  value: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  section: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  banner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.35)',
    backgroundColor: 'rgba(245,165,36,0.1)',
  },
  bannerTitle: { color: COLORS.gold, fontWeight: '800' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docName: { color: COLORS.text, flex: 1, fontSize: 13 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  tableHead: { borderBottomWidth: 1 },
  th: { color: COLORS.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  td: { color: COLORS.text, fontSize: 11 },
  num: { flex: 1, textAlign: 'right' },
});
