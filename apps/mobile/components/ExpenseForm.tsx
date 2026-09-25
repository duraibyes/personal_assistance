import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { DateInput } from './ui/DateInput';
import { Button } from './ui/Button';
import { ErrorBox, SectionTitle } from './ui/Bits';
import { ReceiptScanner } from './ReceiptScanner';
import { api, ApiError } from '../lib/api';
import { todayISO } from '../lib/config';
import { PAYMENT_METHODS } from '../lib/constants';
import { ExpenseExtraction, matchCategoryId } from '../lib/receipt';

export type ExpenseRecord = {
  id: string;
  amount: number;
  category: string;
  categoryId?: string | null;
  description: string;
  date: string;
  paymentMethod: string;
  vendorName?: string | null;
  transactionId?: string | null;
  upiId?: string | null;
  documentId?: string | null;
};

type Category = { id: string; name: string; icon: string | null };

export function ExpenseForm({ initial }: { initial?: ExpenseRecord }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [f, setF] = useState({
    amount: initial ? String(initial.amount) : '',
    categoryId: initial?.categoryId ?? '',
    description: initial?.description ?? '',
    date: initial?.date ? initial.date.substring(0, 10) : todayISO(),
    paymentMethod: initial?.paymentMethod ?? 'UPI',
    vendorName: initial?.vendorName ?? '',
    transactionId: initial?.transactionId ?? '',
    upiId: initial?.upiId ?? '',
  });
  const set = (key: keyof typeof f) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));
  const [documentId, setDocumentId] = useState<string | null>(initial?.documentId ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Category[]>('/categories?type=EXPENSE')
      .then((cats) => {
        setCategories(cats);
        // Older records only stored the category name; map it back to an id.
        setF((prev) =>
          prev.categoryId ? prev : { ...prev, categoryId: cats.find((c) => c.name === initial?.category)?.id ?? '' }
        );
      })
      .catch(() => setCategories([]));
  }, [initial?.category]);

  const applyExtraction = (data: ExpenseExtraction, docId: string | null) => {
    if (docId) setDocumentId(docId);
    const categoryId = matchCategoryId(categories, data.category);
    setF((prev) => ({
      ...prev,
      amount: data.amount ? String(data.amount) : prev.amount,
      date: data.date ? data.date.substring(0, 10) : prev.date,
      vendorName: data.vendorName ?? prev.vendorName,
      transactionId: data.transactionId ?? prev.transactionId,
      upiId: data.upiId ?? prev.upiId,
      categoryId: categoryId ?? prev.categoryId,
      // The receipt has no description of its own — the vendor is the best stand-in.
      description: prev.description.trim() ? prev.description : data.vendorName ?? prev.description,
      // A UPI id on the receipt is a reliable tell for how it was paid.
      paymentMethod: data.upiId ? 'UPI' : prev.paymentMethod,
    }));
    setErrors({});
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!(Number(f.amount) > 0)) next.amount = 'Amount must be positive';
    if (!f.categoryId) next.categoryId = 'Category is required';
    if (!f.description.trim()) next.description = 'Description is required';
    if (!f.date) next.date = 'Date is required';
    if (!f.paymentMethod) next.paymentMethod = 'Payment method is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setServerError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        amount: Number(f.amount),
        categoryId: f.categoryId,
        category: categories.find((c) => c.id === f.categoryId)?.name || 'Other',
        description: f.description.trim(),
        date: f.date,
        paymentMethod: f.paymentMethod,
        vendorName: f.vendorName.trim() || null,
        transactionId: f.transactionId.trim() || null,
        upiId: f.upiId.trim() || null,
        documentId,
      };
      if (initial) await api(`/expenses/${initial.id}`, { method: 'PUT', body });
      else await api('/expenses', { method: 'POST', body });
      router.back();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ErrorBox message={serverError} />
      <Card>
        <SectionTitle>Scan a receipt</SectionTitle>
        <ReceiptScanner entityId={initial?.id} attached={!!documentId} onExtracted={applyExtraction} />
      </Card>
      <Card>
        <SectionTitle>Expense details</SectionTitle>
        <Input label="Amount (₹)" value={f.amount} onChangeText={set('amount')} keyboardType="decimal-pad" error={errors.amount} />
        <Select
          label="Category"
          value={f.categoryId}
          options={categories.map((c) => ({ value: c.id, label: c.icon ? `${c.icon} ${c.name}` : c.name }))}
          onChange={set('categoryId')}
          error={errors.categoryId}
        />
        <Input label="Description" value={f.description} onChangeText={set('description')} error={errors.description} />
        <DateInput label="Date" value={f.date} onChange={set('date')} error={errors.date} />
        <Select label="Payment method" value={f.paymentMethod} options={PAYMENT_METHODS} onChange={set('paymentMethod')} error={errors.paymentMethod} />
        <Input label="Vendor (optional)" value={f.vendorName} onChangeText={set('vendorName')} />
        <Input label="Transaction ID (optional)" value={f.transactionId} onChangeText={set('transactionId')} autoCapitalize="none" />
        <Input label="UPI ID (optional)" value={f.upiId} onChangeText={set('upiId')} autoCapitalize="none" />
      </Card>
      <View style={styles.actions}>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} disabled={saving} style={{ flex: 1 }} />
        <Button title={initial ? 'Save changes' : 'Save expense'} onPress={onSubmit} loading={saving} style={{ flex: 1 }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
});
