import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { IncomeForm, IncomeRecord } from '../../../components/IncomeForm';
import { api } from '../../../lib/api';
import { COLORS } from '../../../lib/config';

export default function EditIncomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<IncomeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<IncomeRecord>(`/incomes/${id}`)
      .then(setRecord)
      .catch(() => setRecord(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Screen title="Edit Income" loading={loading} back>
      {record ? <IncomeForm initial={record} /> : <Text style={{ color: COLORS.muted }}>Income not found.</Text>}
    </Screen>
  );
}
