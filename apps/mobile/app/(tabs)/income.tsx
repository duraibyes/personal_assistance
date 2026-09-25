import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { Card, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { DateInput } from '../../components/ui/DateInput';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { IconButton, SearchBar } from '../../components/ui/Bits';
import { api } from '../../lib/api';
import { usePagedList } from '../../lib/usePagedList';
import { COLORS, formatDate, formatINR } from '../../lib/config';
import { withAll } from '../../lib/constants';

type Income = {
  id: string;
  amount: number;
  source: string;
  categoryRef?: { name: string; icon: string | null } | null;
  description?: string | null;
  date: string;
};

type Category = { id: string; name: string; icon: string | null };

export default function IncomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deleting, setDeleting] = useState<Income | null>(null);
  const [busy, setBusy] = useState(false);

  const list = usePagedList<Income>('/incomes', { search, categoryId, dateFrom, dateTo });
  const activeFilters = [categoryId, dateFrom, dateTo].filter(Boolean).length;

  useFocusEffect(
    useCallback(() => {
      api<Category[]>('/categories?type=INCOME').then(setCategories).catch(() => undefined);
    }, [])
  );

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/incomes/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await list.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Income"
      subtitle={`${list.total} record${list.total === 1 ? '' : 's'}`}
      loading={list.loading}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      right={<Button title="Add" icon="add" size="sm" onPress={() => router.push('/income/add')} />}
    >
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search source or notes" />
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
          <View style={styles.dates}>
            <View style={{ flex: 1 }}><DateInput label="From" value={dateFrom} onChange={setDateFrom} optional /></View>
            <View style={{ flex: 1 }}><DateInput label="To" value={dateTo} onChange={setDateTo} optional /></View>
          </View>
        </Card>
      ) : null}

      {list.items.length === 0 ? (
        <EmptyState
          title={search || activeFilters ? 'No matching income' : 'No income records'}
          hint={search || activeFilters ? 'Try adjusting your search or filters.' : 'Add salary or other income sources.'}
        />
      ) : (
        list.items.map((item) => (
          <Card key={item.id} onPress={() => router.push(`/income/${item.id}/edit`)}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.categoryRef?.icon ? `${item.categoryRef.icon} ` : ''}{item.categoryRef?.name ?? item.source}
                </Text>
                <Text style={styles.meta}>{formatDate(item.date)}{item.description ? ` · ${item.description}` : ''}</Text>
              </View>
              <Text style={styles.amount}>+{formatINR(item.amount)}</Text>
              <IconButton icon="trash-outline" tone="danger" onPress={() => setDeleting(item)} />
            </View>
          </Card>
        ))
      )}

      {list.hasMore ? <Button title="Load more" variant="secondary" onPress={list.loadMore} loading={list.loadingMore} /> : null}

      <ConfirmDialog
        visible={!!deleting}
        title="Delete income?"
        description="This income record will be permanently removed."
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
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  meta: { color: COLORS.muted, fontSize: 12 },
  amount: { color: COLORS.success, fontSize: 16, fontWeight: '900' },
});
