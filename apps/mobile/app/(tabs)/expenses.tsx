import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { Card, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { DateInput } from '../../components/ui/DateInput';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge, IconButton, SearchBar } from '../../components/ui/Bits';
import { api } from '../../lib/api';
import { usePagedList } from '../../lib/usePagedList';
import { COLORS, formatDate, formatINR } from '../../lib/config';
import { formatPaymentMethod, PAYMENT_METHODS, withAll } from '../../lib/constants';

type Expense = {
  id: string;
  amount: number;
  category: string;
  categoryRef?: { name: string; icon: string | null } | null;
  description: string;
  date: string;
  paymentMethod: string;
  vendorName?: string | null;
  documentId?: string | null;
};

type Category = { id: string; name: string; icon: string | null };

export default function ExpensesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);

  const list = usePagedList<Expense>('/expenses', { search, categoryId, paymentMethod, dateFrom, dateTo });
  const activeFilters = [categoryId, paymentMethod, dateFrom, dateTo].filter(Boolean).length;

  useFocusEffect(
    useCallback(() => {
      api<Category[]>('/categories?type=EXPENSE').then(setCategories).catch(() => undefined);
    }, [])
  );

  const clearFilters = () => {
    setCategoryId('');
    setPaymentMethod('');
    setDateFrom('');
    setDateTo('');
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/expenses/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await list.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Expenses"
      subtitle={`${list.total} record${list.total === 1 ? '' : 's'}`}
      loading={list.loading}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      right={<Button title="Add" icon="add" size="sm" onPress={() => router.push('/expense/add')} />}
    >
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search description or vendor" />
        </View>
        <IconButton icon="options-outline" tone={activeFilters ? 'primary' : 'neutral'} onPress={() => setShowFilters((v) => !v)} style={styles.filterBtn} />
      </View>
      {showFilters ? (
        <Card>
          <Select
            label="Category"
            value={categoryId}
            options={withAll(categories.map((c) => ({ value: c.id, label: c.icon ? `${c.icon} ${c.name}` : c.name })))}
            onChange={setCategoryId}
          />
          <Select label="Payment method" value={paymentMethod} options={withAll(PAYMENT_METHODS)} onChange={setPaymentMethod} />
          <View style={styles.dates}>
            <View style={{ flex: 1 }}><DateInput label="From" value={dateFrom} onChange={setDateFrom} optional /></View>
            <View style={{ flex: 1 }}><DateInput label="To" value={dateTo} onChange={setDateTo} optional /></View>
          </View>
          {activeFilters ? <Button title="Clear filters" variant="ghost" size="sm" onPress={clearFilters} /> : null}
        </Card>
      ) : null}

      {list.items.length === 0 ? (
        <EmptyState
          title={search || activeFilters ? 'No matching expenses' : 'No expenses'}
          hint={search || activeFilters ? 'Try adjusting your search or filters.' : 'Add your first expense to start tracking.'}
        />
      ) : (
        list.items.map((item) => (
          <Card key={item.id} onPress={() => router.push(`/expense/${item.id}/edit`)}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.meta}>
                  {item.categoryRef?.icon ? `${item.categoryRef.icon} ` : ''}{item.categoryRef?.name ?? item.category} · {formatDate(item.date)}
                </Text>
              </View>
              <Text style={styles.amount}>-{formatINR(item.amount)}</Text>
            </View>
            <View style={styles.rowBetween}>
              <View style={styles.badges}>
                <Badge label={formatPaymentMethod(item.paymentMethod)} tone="primary" />
                {item.vendorName ? <Badge label={item.vendorName} /> : null}
                {item.documentId ? <Badge label="Receipt" tone="success" icon="attach" /> : null}
              </View>
              <IconButton icon="trash-outline" tone="danger" onPress={() => setDeleting(item)} />
            </View>
          </Card>
        ))
      )}

      {list.hasMore ? <Button title="Load more" variant="secondary" onPress={list.loadMore} loading={list.loadingMore} /> : null}

      <ConfirmDialog
        visible={!!deleting}
        title="Delete expense?"
        description={`"${deleting?.description}" will be permanently removed.`}
        confirmLabel="Delete"
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
  dates: { flexDirection: 'row', gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  meta: { color: COLORS.muted, fontSize: 12 },
  amount: { color: '#fb7185', fontSize: 16, fontWeight: '900' },
});
