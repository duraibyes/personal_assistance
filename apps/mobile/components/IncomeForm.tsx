import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { DateInput } from './ui/DateInput';
import { Button } from './ui/Button';
import { ErrorBox } from './ui/Bits';
import { api, ApiError } from '../lib/api';
import { todayISO } from '../lib/config';

export type IncomeRecord = {
  id: string;
  amount: number;
  source: string;
  categoryId?: string | null;
  description?: string | null;
  date: string;
};

type Category = { id: string; name: string; icon: string | null };

/** Same shape as the web IncomeForm: the chosen category doubles as the income source. */
export function IncomeForm({ initial }: { initial?: IncomeRecord }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date ? initial.date.substring(0, 10) : todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Category[]>('/categories?type=INCOME')
      .then((cats) => {
        setCategories(cats);
        setCategoryId((prev) => prev || cats.find((c) => c.name === initial?.source)?.id || '');
      })
      .catch(() => setCategories([]));
  }, [initial?.source]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!(Number(amount) > 0)) next.amount = 'Amount must be positive';
    if (!categoryId) next.categoryId = 'Source / category is required';
    if (!date) next.date = 'Date is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setServerError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        amount: Number(amount),
        categoryId,
        source: categories.find((c) => c.id === categoryId)?.name || 'Other',
        description: description.trim() || null,
        date,
      };
      if (initial) await api(`/incomes/${initial.id}`, { method: 'PUT', body });
      else await api('/incomes', { method: 'POST', body });
      router.back();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Failed to save income');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ErrorBox message={serverError} />
      <Card>
        <Input label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={errors.amount} />
        <Select
          label="Source / category"
          value={categoryId}
          options={categories.map((c) => ({ value: c.id, label: c.icon ? `${c.icon} ${c.name}` : c.name }))}
          onChange={setCategoryId}
          error={errors.categoryId}
        />
        <DateInput label="Date" value={date} onChange={setDate} error={errors.date} />
        <Input label="Notes (optional)" value={description} onChangeText={setDescription} multiline />
      </Card>
      <View style={styles.actions}>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} disabled={saving} style={{ flex: 1 }} />
        <Button title={initial ? 'Save changes' : 'Save income'} onPress={onSubmit} loading={saving} style={{ flex: 1 }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
});
