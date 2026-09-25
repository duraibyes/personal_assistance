import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { Card, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge, IconButton, LOAN_STATUS_TONE, ProgressBar, SearchBar } from '../../components/ui/Bits';
import { api } from '../../lib/api';
import { usePagedList } from '../../lib/usePagedList';
import { COLORS, formatDate, formatINR } from '../../lib/config';
import { labelFor, LOAN_STATUSES, LOAN_TYPES, withAll } from '../../lib/constants';

type Loan = {
  id: string;
  name: string;
  lender: string;
  loanType: string;
  principalAmount: number;
  interestRate: number;
  emiAmount: number;
  status: string;
  paidEmis: number;
  numberOfEmis: number;
  nextEmiDate: string;
};

export default function LoansScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loanType, setLoanType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleting, setDeleting] = useState<Loan | null>(null);
  const [busy, setBusy] = useState(false);

  const list = usePagedList<Loan>('/loans', { search, status, loanType });
  const hasFilters = !!(search || status || loanType);

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/loans/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await list.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Loans"
      subtitle={`${list.total} loan${list.total === 1 ? '' : 's'} · EMIs and balances`}
      loading={list.loading}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      right={<Button title="Add" icon="add" size="sm" onPress={() => router.push('/loan/add')} />}
    >
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, lender, loan number" />
        </View>
        <IconButton icon="options-outline" tone={status || loanType ? 'primary' : 'neutral'} onPress={() => setShowFilters((v) => !v)} style={styles.filterBtn} />
      </View>
      {showFilters ? (
        <Card>
          <Select label="Status" value={status} options={withAll(LOAN_STATUSES)} onChange={setStatus} />
          <Select label="Type" value={loanType} options={withAll(LOAN_TYPES)} onChange={setLoanType} />
        </Card>
      ) : null}

      {list.items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No matching loans' : 'No loans yet'}
          hint={hasFilters ? 'Try adjusting your search or filters.' : 'Tap Add to start tracking a loan.'}
        />
      ) : (
        list.items.map((loan) => (
          <Card key={loan.id} onPress={() => router.push(`/loan/${loan.id}`)}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{loan.name}</Text>
                <Text style={styles.meta}>{loan.lender} · {labelFor(LOAN_TYPES, loan.loanType)}</Text>
              </View>
              <IconButton icon="receipt-outline" tone="success" onPress={() => router.push(`/loan/${loan.id}/emis`)} />
              <IconButton icon="create-outline" tone="primary" onPress={() => router.push(`/loan/${loan.id}/edit`)} />
              <IconButton icon="trash-outline" tone="danger" onPress={() => setDeleting(loan)} />
            </View>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.label}>MONTHLY EMI</Text>
                <Text style={styles.amount}>{formatINR(loan.emiAmount)}</Text>
                <Text style={styles.meta}>Next {formatDate(loan.nextEmiDate)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.label}>PRINCIPAL</Text>
                <Text style={styles.value}>{formatINR(loan.principalAmount)}</Text>
                <Text style={styles.meta}>{loan.interestRate}% p.a.</Text>
              </View>
            </View>
            <View style={styles.rowBetween}>
              <Badge label={loan.status} tone={LOAN_STATUS_TONE[loan.status] ?? 'neutral'} />
              <Text style={styles.meta}>{loan.paidEmis} / {loan.numberOfEmis} EMIs</Text>
            </View>
            <ProgressBar value={loan.paidEmis / loan.numberOfEmis} />
          </Card>
        ))
      )}

      {list.hasMore ? <Button title="Load more" variant="secondary" onPress={list.loadMore} loading={list.loadingMore} /> : null}

      <ConfirmDialog
        visible={!!deleting}
        title="Delete loan?"
        description={`"${deleting?.name}" will be moved to the trash.`}
        confirmLabel="Yes, delete"
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  filterBtn: { width: 44, height: 44 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  label: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  meta: { color: COLORS.muted, fontSize: 12 },
  amount: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  value: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
});
