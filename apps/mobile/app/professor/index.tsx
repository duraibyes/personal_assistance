import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { COLORS } from '../../lib/config';

const OPTIONS = [
  {
    href: '/professor/ask',
    icon: 'chatbubbles' as const,
    title: 'Ask',
    subtitle: 'Talk in Tamil or English — see it written in both',
    colors: ['#1f6bff', '#16b87a'] as const,
  },
  {
    href: '/professor/kids',
    icon: 'happy' as const,
    title: 'Kids',
    subtitle: 'Learning corner: English, Maths, stories, bedtime & more',
    colors: ['#7c3aed', '#f472b6'] as const,
  },
];

export default function ProfessorHome() {
  const router = useRouter();
  return (
    <Screen title="Professor" subtitle="Choose what you'd like to do" back>
      {OPTIONS.map((o) => (
        <Pressable key={o.href} onPress={() => router.push(o.href as never)} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
          <LinearGradient colors={[...o.colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={o.icon} size={34} color="#fff" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>{o.title}</Text>
              <Text style={styles.subtitle}>{o.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        </Pressable>
      ))}
      <Text style={styles.note}>More Professor features are on the way.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 22, borderRadius: 24, minHeight: 130 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18 },
  note: { color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: 4 },
});
