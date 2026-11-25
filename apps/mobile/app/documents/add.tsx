import React from 'react';
import { Screen } from '../../components/ui/Screen';
import { VaultDocumentForm } from '../../components/VaultDocumentForm';

export default function AddDocumentScreen() {
  return (
    <Screen title="Add Document" subtitle="Saved securely to your cloud storage" back>
      <VaultDocumentForm />
    </Screen>
  );
}
