import React from 'react';
import { Screen } from '../../components/ui/Screen';
import { LoanForm } from '../../components/LoanForm';

export default function AddLoanScreen() {
  return (
    <Screen title="Add Loan" subtitle="Upload a document or fill the form" back>
      <LoanForm />
    </Screen>
  );
}
