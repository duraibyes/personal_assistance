import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Logo } from '../../components/ui/Bits';
import { useAuth } from '../../lib/auth';
import { COLORS, WEB_URL } from '../../lib/config';

const LINKS: { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string; href: string; color: string }[] = [
  { icon: 'school-outline', label: 'Professor', hint: 'Talk in Tamil or English — see it in both', href: '/professor', color: COLORS.teal },
  { icon: 'repeat-outline', label: 'Recurring bills', hint: 'Rent, subscriptions, reminders', href: '/recurring', color: '#a78bfa' },
  { icon: 'pricetags-outline', label: 'Categories', hint: 'Expense & income categories', href: '/categories', color: COLORS.gold },
  { icon: 'add-circle-outline', label: 'Add loan', hint: 'Upload a loan document to auto-fill', href: '/loan/add', color: COLORS.green },
];

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [confirmOut, setConfirmOut] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      router.replace('/login');
    } finally {
      setLoading(false);
      setConfirmOut(false);
    }
  };

  return (
    <Screen title="More">
      <Card>
        <View style={styles.row}>
          <Logo size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.value}>{user?.name || 'Signed in'}</Text>
            <Text style={styles.label}>{user?.email}</Text>
            {user?.isAdmin ? <Text style={styles.admin}>Global admin</Text> : null}
          </View>
        </View>
      </Card>

      {LINKS.map((l) => (
        <Pressable key={l.href} onPress={() => router.push(l.href as never)}>
          {({ pressed }) => (
            <Card style={{ opacity: pressed ? 0.85 : 1 }}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: `${l.color}22` }]}>
                  <Ionicons name={l.icon} size={20} color={l.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.value}>{l.label}</Text>
                  <Text style={styles.label}>{l.hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </View>
            </Card>
          )}
        </Pressable>
      ))}

      <Pressable onPress={() => Linking.openURL(WEB_URL)}>
        <Card>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: 'rgba(47,123,255,0.15)' }]}>
              <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.value}>Open web app</Text>
              <Text style={styles.label}>{WEB_URL.replace('https://', '')}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={COLORS.muted} />
          </View>
        </Card>
      </Pressable>

      <Button title="Sign out" icon="log-out-outline" variant="danger" onPress={() => setConfirmOut(true)} />
      <Text style={styles.version}>WealthGuard v{Constants.expoConfig?.version ?? '—'}</Text>

      <ConfirmDialog
        visible={confirmOut}
        title="Sign out?"
        description="You will need to sign in again to access your data."
        confirmLabel="Sign out"
        loading={loading}
        onCancel={() => setConfirmOut(false)}
        onConfirm={handleSignOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { color: COLORS.muted, fontSize: 12 },
  value: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  admin: { color: COLORS.gold, fontSize: 12, fontWeight: '700', marginTop: 2 },
  version: { color: COLORS.muted, fontSize: 11, textAlign: 'center' },
});
