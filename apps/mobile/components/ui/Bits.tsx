import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND_GRADIENT, COLORS } from '../../lib/config';

const logo = require('../../assets/logo.png');

export function Logo({ size = 40 }: { size?: number }) {
  return <Image source={logo} style={{ width: size, height: size * 1.07 }} resizeMode="contain" />;
}

const TONES = {
  neutral: { fg: COLORS.muted, bg: 'rgba(159,176,212,0.14)' },
  primary: { fg: '#8fb6ff', bg: 'rgba(47,123,255,0.18)' },
  success: { fg: COLORS.success, bg: 'rgba(52,211,153,0.15)' },
  warning: { fg: COLORS.gold, bg: 'rgba(245,165,36,0.16)' },
  danger: { fg: '#fb7185', bg: 'rgba(244,63,94,0.16)' },
};
export type Tone = keyof typeof TONES;

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: keyof typeof Ionicons.glyphMap }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={t.fg} /> : null}
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export const LOAN_STATUS_TONE: Record<string, Tone> = { ACTIVE: 'success', CLOSED: 'neutral', FORECLOSED: 'warning' };

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={styles.track}>
      <LinearGradient
        colors={[...BRAND_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 999 }}
      />
    </View>
  );
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={17} color={COLORS.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        style={styles.searchInput}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={10}>
          <Ionicons name="close-circle" size={17} color={COLORS.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Round icon button used for row actions (edit, delete, EMI…). */
export function IconButton({
  icon,
  onPress,
  tone = 'neutral',
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: Tone;
  style?: ViewStyle;
}) {
  const t = TONES[tone];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: t.bg, opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Ionicons name={icon} size={17} color={t.fg} />
    </Pressable>
  );
}

export function StatTile({ label, value, sub, icon, tone = 'primary' }: { label: string; value: string; sub?: string; icon: keyof typeof Ionicons.glyphMap; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <Text style={styles.tileLabel}>{label}</Text>
        <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={14} color={t.fg} />
        </View>
      </View>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function ErrorBox({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  track: { height: 6, borderRadius: 999, backgroundColor: 'rgba(159,176,212,0.15)', overflow: 'hidden' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10 },
  iconBtn: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', flex: 1 },
  tileIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileValue: { color: COLORS.text, fontSize: 19, fontWeight: '800', marginTop: 6 },
  tileSub: { color: COLORS.muted, fontSize: 11 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  section: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  errorBox: { backgroundColor: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)', borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { color: '#fda4af', fontSize: 13 },
});
