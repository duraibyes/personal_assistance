import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/ui/Screen';
import { Card, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorBox, IconButton, SearchBar } from '../../components/ui/Bits';
import { ApiError } from '../../lib/api';
import { COLORS, formatDate, formatINR } from '../../lib/config';
import { openDocument } from '../../lib/documents';
import { categoryInfo, isImage, listVault, VAULT_CATEGORIES, VaultDocument } from '../../lib/vault';

/** Document vault: every proof, ID card and certificate in one place. */
export default function DocumentsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<VaultDocument[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wait for typing to pause before searching.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        setItems(await listVault({ category: category || undefined, search: query || undefined }));
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not load documents');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, query]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const total = items.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const filtered = !!(category || query);

  return (
    <Screen
      title="Documents"
      subtitle={
        items.length
          ? `${items.length} saved${total > 0 ? ` · ${formatINR(total)} paid` : ''}`
          : 'Proofs, ID cards and certificates'
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      right={<Button title="Add" icon="add" size="sm" onPress={() => router.push('/documents/add' as never)} />}
      back
    >
      <Button title="Add document" icon="cloud-upload-outline" onPress={() => router.push('/documents/add' as never)} />

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or notes" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={!category} onPress={() => setCategory('')} />
        {VAULT_CATEGORIES.map((c) => (
          <Chip key={c.value} label={c.label} icon={c.icon} color={c.color} selected={category === c.value} onPress={() => setCategory(c.value)} />
        ))}
      </ScrollView>

      <ErrorBox message={error} />

      {items.length === 0 && !error ? (
        <EmptyState
          title={filtered ? 'Nothing matches' : 'No documents yet'}
          hint={
            filtered
              ? 'Try another type or search.'
              : 'Take a photo of a fee receipt, service bill, EB bill, Aadhaar or PAN card and keep it here.'
          }
        />
      ) : (
        items.map((doc) => {
          const c = categoryInfo(doc.category);
          return (
            <Card key={doc.id} onPress={() => openDocument(doc)}>
              <View style={styles.row}>
                {isImage(doc.mimeType) ? (
                  <Image source={{ uri: doc.storageKey }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbIcon, { backgroundColor: `${c.color}22` }]}>
                    <Ionicons name="document-text" size={22} color={c.color} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title} numberOfLines={1}>{doc.title}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name={c.icon} size={12} color={c.color} />
                    <Text style={[styles.meta, { color: c.color }]}>{c.label}</Text>
                    {doc.recordDate ? <Text style={styles.meta}>· {formatDate(doc.recordDate)}</Text> : null}
                  </View>
                  {doc.notes ? <Text style={styles.meta} numberOfLines={1}>{doc.notes}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {doc.amount != null ? <Text style={styles.amount}>{formatINR(doc.amount)}</Text> : null}
                  <IconButton icon="create-outline" tone="primary" onPress={() => router.push(`/documents/${doc.id}` as never)} />
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

function Chip({
  label,
  icon,
  color,
  selected,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      {icon ? <Ionicons name={icon} size={13} color={selected ? COLORS.text : color ?? COLORS.muted} /> : null}
      <Text style={[styles.chipText, selected && { color: COLORS.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(47,123,255,0.22)' },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: COLORS.inputBg },
  thumbIcon: { alignItems: 'center', justifyContent: 'center' },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: COLORS.muted, fontSize: 12 },
  amount: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
});
