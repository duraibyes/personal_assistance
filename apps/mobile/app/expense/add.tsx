import React from 'react';
import { Screen } from '../../components/ui/Screen';
import { ExpenseForm } from '../../components/ExpenseForm';

export default function AddExpenseScreen() {
  return (
    <Screen title="Add Expense" back>
      <ExpenseForm />
    </Screen>
  );
}
