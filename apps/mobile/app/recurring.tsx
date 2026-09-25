import React, { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../components/ui/Screen';
import { Card, EmptyState } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DateInput } from '../components/ui/DateInput';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Badge, ErrorBox, IconButton } from '../components/ui/Bits';
import { api, ApiError } from '../lib/api';
import { COLORS, formatDate, formatINR, todayISO } from '../lib/config';
import { formatPaymentMethod, labelFor, PAYMENT_METHODS, RECURRING_FREQUENCIES } from '../lib/constants';

type Recurring = {
  id: string;
  title: string;
  amount: number;
  categoryId?: string | null;
  category?: { name: string; icon: string | null } | null;
  frequency: string;
  nextDueDate: string;
  lastPaymentDate?: string | null;
  paymentMethod: string;
  notes?: string | null;
  isActive: boolean;
};

type Category = { id: string; name: string; icon: string | null };

const EMPTY = {
  title: '',
  amount: '',
  categoryId: '',
  frequency: 'MONTHLY',
  nextDueDate: todayISO(),
  lastPaymentDate: '',
  paymentMethod: 'UPI',
  notes: '',
};

export default function RecurringScreen() {
  const [items, setItems] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [f, setF] = useState(EMPTY);
  const set = (key: keyof typeof EMPTY) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Recurring | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [data, cats] = await Promise.all([
        api<Recurring[]>('/recurring'),
        api<Category[]>('/categories?type=EXPENSE').catch(() => []),
      ]);
      setItems(data);
      setCategories(cats);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openAdd = () => {
    setEditing(null);
    setF(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (item: Recurring) => {
    setEditing(item);
    setF({
      title: item.title,
      amount: String(item.amount),
      categoryId: item.categoryId ?? '',
      frequency: item.frequency,
      nextDueDate: item.nextDueDate.substring(0, 10),
      lastPaymentDate: item.lastPaymentDate ? item.lastPaymentDate.substring(0, 10) : '',
      paymentMethod: item.paymentMethod,
      notes: item.notes ?? '',
    });
    setError(null);
    setOpen(true);
  };

  const onSave = async () => {
    if (!f.title.trim()) return setError('Title is required');
    if (!(Number(f.amount) > 0)) return setError('Amount must be positive');
    if (!f.nextDueDate) return setError('Next due date is required');
    setError(null);
    setSaving(true);
    try {
      const body = {
        title: f.title.trim(),
        amount: Number(f.amount),
        categoryId: f.categoryId || null,
        frequency: f.frequency,
        nextDueDate: f.nextDueDate,
        lastPaymentDate: f.lastPaymentDate || null,
        paymentMethod: f.paymentMethod,
        notes: f.notes.trim() || null,
      };
      if (editing) await api(`/recurring/${editing.id}`, { method: 'PATCH', body });
      else await api('/recurring', { method: 'POST', body: { ...body, isActive: true } });
      setOpen(false);
      await load(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: Recurring) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: !i.isActive } : i)));
    try {
      await api(`/recurring/${item.id}`, { method: 'PATCH', body: { isActive: !item.isActive } });
    } catch {
      await load(true);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/recurring/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load(true);
    } finally {
      setBusy(false);
    }
  };

  const monthlyTotal = items
    .filter((i) => i.isActive)
    .reduce((sum, i) => sum + i.amount / ({ MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6, YEARLY: 12 }[i.frequency] ?? 1), 0);

  return (
    <Screen
      title="Recurring"
      subtitle={`≈ ${formatINR(monthlyTotal)} / month active`}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      right={<Button title="Add" icon="add" size="sm" onPress={openAdd} />}
      back
    >
      {items.length === 0 ? (
        <EmptyState title="No recurring bills" hint="Add rent, subscriptions and other repeating payments." />
      ) : (
        items.map((item) => (
          <Card key={item.id} onPress={() => openEdit(item)} style={!item.isActive ? styles.inactive : undefined}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.category?.icon ? `${item.category.icon} ` : ''}{item.title}</Text>
                <Text style={styles.meta}>
                  {labelFor(RECURRING_FREQUENCIES, item.frequency)} · due {formatDate(item.nextDueDate)}
                </Text>
              </View>
              <Text style={styles.amount}>{formatINR(item.amount)}</Text>
            </View>
            <View style={styles.rowBetween}>
              <View style={styles.badges}>
                <Badge label={formatPaymentMethod(item.paymentMethod)} tone="primary" />
                <Badge label={item.isActive ? 'Active' : 'Paused'} tone={item.isActive ? 'success' : 'neutral'} />
              </View>
              <Switch
                value={item.isActive}
                onValueChange={() => toggleActive(item)}
                trackColor={{ true: COLORS.primary, false: 'rgba(159,176,212,0.3)' }}
                thumbColor="#fff"
              />
              <IconButton icon="trash-outline" tone="danger" onPress={() => setDeleting(item)} />
            </View>
            {item.notes ? <Text style={styles.meta}>{item.notes}</Text> : null}
          </Card>
        ))
      )}

      <Sheet visible={open} title={editing ? 'Edit recurring' : 'Add recurring'} onClose={() => setOpen(false)} busy={saving}>
        <ErrorBox message={error} />
        <Input label="Title" value={f.title} onChangeText={set('title')} placeholder="Rent, Netflix…" />
        <Input label="Amount (₹)" value={f.amount} onChangeText={set('amount')} keyboardType="decimal-pad" />
        <Select
          label="Category (optional)"
          value={f.categoryId}
          options={[{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.icon ? `${c.icon} ${c.name}` : c.name }))]}
          onChange={set('categoryId')}
        />
        <Select label="Frequency" value={f.frequency} options={RECURRING_FREQUENCIES} onChange={set('frequency')} />
        <DateInput label="Next due date" value={f.nextDueDate} onChange={set('nextDueDate')} />
        <DateInput label="Last payment date (optional)" value={f.lastPaymentDate} onChange={set('lastPaymentDate')} optional />
        <Select label="Payment method" value={f.paymentMethod} options={PAYMENT_METHODS} onChange={set('paymentMethod')} />
        <Input label="Notes (optional)" value={f.notes} onChangeText={set('notes')} multiline />
        <Button title={editing ? 'Save changes' : 'Add recurring'} onPress={onSave} loading={saving} />
      </Sheet>

      <ConfirmDialog
        visible={!!deleting}
        title="Delete recurring item?"
        description={`"${deleting?.title}" will be removed.`}
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inactive: { opacity: 0.6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badges: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  title: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  amount: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  meta: { color: COLORS.muted, fontSize: 12 },
});
