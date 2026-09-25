import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { ExpenseForm, ExpenseRecord } from '../../../components/ExpenseForm';
import { api } from '../../../lib/api';
import { COLORS } from '../../../lib/config';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<ExpenseRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ExpenseRecord>(`/expenses/${id}`)
      .then(setRecord)
      .catch(() => setRecord(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Screen title="Edit Expense" loading={loading} back>
      {record ? <ExpenseForm initial={record} /> : <Text style={{ color: COLORS.muted }}>Expense not found.</Text>}
    </Screen>
  );
}
