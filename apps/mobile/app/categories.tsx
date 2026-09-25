import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../components/ui/Screen';
import { Card, EmptyState } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Badge, ErrorBox, IconButton } from '../components/ui/Bits';
import { api, ApiError } from '../lib/api';
import { COLORS } from '../lib/config';
import { CATEGORY_TYPES, labelFor, withAll } from '../lib/constants';

type Category = {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  isActive: boolean;
  isSystem?: boolean;
};

export default function CategoriesScreen() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [icon, setIcon] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setItems(await api<Category[]>('/categories?includeInactive=true'));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openForm = (category: Category | null) => {
    setEditing(category);
    setName(category?.name ?? '');
    setType(category?.type ?? 'EXPENSE');
    setIcon(category?.icon ?? '');
    setError(null);
    setOpen(true);
  };

  const onSave = async () => {
    if (!name.trim()) return setError('Category name is required');
    setError(null);
    setSaving(true);
    try {
      const body = { name: name.trim(), type, icon: icon.trim() || null };
      if (editing) await api(`/categories/${editing.id}`, { method: 'PATCH', body });
      else await api('/categories', { method: 'POST', body });
      setOpen(false);
      await load(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: Category) => {
    setItems((prev) => prev.map((c) => (c.id === category.id ? { ...c, isActive: !c.isActive } : c)));
    try {
      await api(`/categories/${category.id}`, { method: 'PATCH', body: { isActive: !category.isActive } });
    } catch {
      await load(true);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/categories/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load(true);
    } catch (err) {
      setDeleting(null);
      setError(err instanceof ApiError ? err.message : 'Cannot delete this category');
    } finally {
      setBusy(false);
    }
  };

  const visible = typeFilter ? items.filter((c) => c.type === typeFilter || c.type === 'BOTH') : items;

  return (
    <Screen
      title="Categories"
      subtitle={`${items.filter((c) => c.isActive).length} active`}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      right={<Button title="Add" icon="add" size="sm" onPress={() => openForm(null)} />}
      back
    >
      {!open ? <ErrorBox message={error} /> : null}
      <View style={styles.filters}>
        {withAll(CATEGORY_TYPES).map((t) => (
          <Pressable key={t.value} onPress={() => setTypeFilter(t.value)} style={[styles.chip, typeFilter === t.value && styles.chipActive]}>
            <Text style={[styles.chipText, typeFilter === t.value && styles.chipTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {visible.length === 0 ? (
        <EmptyState title="No categories" />
      ) : (
        visible.map((item) => (
          <Card key={item.id} onPress={() => openForm(item)} style={!item.isActive ? styles.inactive : undefined}>
            <View style={styles.row}>
              <Text style={styles.icon}>{item.icon || '🏷️'}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.badges}>
                  <Badge label={labelFor(CATEGORY_TYPES, item.type)} tone="primary" />
                  {item.isSystem ? <Badge label="System" /> : null}
                  {!item.isActive ? <Badge label="Inactive" tone="warning" /> : null}
                </View>
              </View>
              <Switch
                value={item.isActive}
                onValueChange={() => toggleActive(item)}
                trackColor={{ true: COLORS.primary, false: 'rgba(159,176,212,0.3)' }}
                thumbColor="#fff"
              />
              {!item.isSystem ? <IconButton icon="trash-outline" tone="danger" onPress={() => setDeleting(item)} /> : null}
            </View>
          </Card>
        ))
      )}

      <Sheet visible={open} title={editing ? 'Edit category' : 'Add category'} onClose={() => setOpen(false)} busy={saving}>
        <ErrorBox message={error} />
        <Input label="Name" value={name} onChangeText={setName} placeholder="Groceries" />
        <Input label="Icon (emoji, optional)" value={icon} onChangeText={setIcon} placeholder="🛒" />
        <Select label="Type" value={type} options={CATEGORY_TYPES} onChange={setType} />
        <Button title={editing ? 'Save changes' : 'Add category'} onPress={onSave} loading={saving} />
      </Sheet>

      <ConfirmDialog
        visible={!!deleting}
        title="Delete category?"
        description={`"${deleting?.name}" will be removed if it is not in use.`}
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inactive: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 24 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  name: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  filters: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: COLORS.primaryText },
});
