import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BG_GRADIENT, COLORS } from '../../lib/config';

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  right?: React.ReactNode;
  left?: React.ReactNode;
  scroll?: boolean;
  /** Shows a back arrow; used by every screen pushed on the stack. */
  back?: boolean;
  contentStyle?: ViewStyle;
};

/** The logo-coloured gradient that sits behind every screen. */
export function GradientBackground({ children }: { children?: React.ReactNode }) {
  return (
    <LinearGradient colors={[...BG_GRADIENT]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill}>
      {children}
    </LinearGradient>
  );
}

export function Screen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
  loading,
  right,
  left,
  scroll = true,
  back,
  contentStyle,
}: Props) {
  const router = useRouter();
  const leading = back ? (
    <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
      <Ionicons name="chevron-back" size={22} color={COLORS.text} />
    </Pressable>
  ) : (
    left
  );

  const body = loading ? (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  ) : (
    children
  );

  return (
    <View style={styles.root}>
      <GradientBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {(title || right || leading) && (
          <View style={styles.header}>
            {leading}
            <View style={{ flex: 1 }}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {right}
          </View>
        )}
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
              ) : undefined
            }
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }, contentStyle]}>{body}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47,123,255,0.15)',
  },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 14 },
  center: { paddingVertical: 60, alignItems: 'center' },
});
