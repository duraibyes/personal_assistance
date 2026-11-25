import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorBox } from '../../components/ui/Bits';
import { VaultDocumentForm } from '../../components/VaultDocumentForm';
import { ApiError } from '../../lib/api';
import { deleteVaultDocument, getVaultDocument, VaultDocument } from '../../lib/vault';

export default function EditDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<VaultDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getVaultDocument(String(id))
      .then(setDoc)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load document'));
  }, [id]);

  const onDelete = async () => {
    if (!doc) return;
    setDeleting(true);
    try {
      await deleteVaultDocument(doc.id);
      setConfirm(false);
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
      setConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen title="Edit Document" loading={!doc && !error} back>
      <ErrorBox message={error} />
      {doc ? (
        <>
          <VaultDocumentForm initial={doc} />
          <Button title="Delete document" icon="trash-outline" variant="danger" onPress={() => setConfirm(true)} />
        </>
      ) : null}
      <ConfirmDialog
        visible={confirm}
        title="Delete this document?"
        description="The photo / file is removed from your storage too. This can't be undone."
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setConfirm(false)}
        onConfirm={onDelete}
      />
    </Screen>
  );
}
