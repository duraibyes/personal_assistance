import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { LoanForm, LoanRecord } from '../../../components/LoanForm';
import { api } from '../../../lib/api';
import { COLORS } from '../../../lib/config';

export default function EditLoanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<LoanRecord>(`/loans/${id}`)
      .then(setLoan)
      .catch(() => setLoan(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Screen title="Edit Loan" subtitle={loan?.name} loading={loading} back>
      {loan ? <LoanForm initial={loan} /> : <Text style={{ color: COLORS.muted }}>Loan not found.</Text>}
    </Screen>
  );
}
