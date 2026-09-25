import React from 'react';
import { Screen } from '../../components/ui/Screen';
import { IncomeForm } from '../../components/IncomeForm';

export default function AddIncomeScreen() {
  return (
    <Screen title="Add Income" subtitle="Log a new income entry" back>
      <IncomeForm />
    </Screen>
  );
}
