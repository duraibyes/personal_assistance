import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../../components/ui/Screen';
import { KIDS_SECTIONS } from '../../../lib/kids/sections';

export default function KidsHome() {
  const router = useRouter();
  const bedtime = KIDS_SECTIONS.find((s) => s.id === 'bedtime')!;

  return (
    <Screen title="Kids Learning" subtitle="குழந்தைகள் கற்றல் · Pick something fun!" back>
      <Pressable onPress={() => router.push('/professor/kids/bedtime')}>
        <LinearGradient colors={[...bedtime.colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featured}>
          <Text style={styles.featuredEmoji}>{bedtime.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.featuredKicker}>TONIGHT</Text>
            <Text style={styles.featuredTitle}>Bedtime Stories</Text>
            <Text style={styles.featuredText}>Calm stories with soft music · English & தமிழ்</Text>
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.grid}>
        {KIDS_SECTIONS.map((s) => (
          <Pressable
            key={s.id}
            style={({ pressed }) => [styles.cell, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={() => router.push((s.id === 'bedtime' ? '/professor/kids/bedtime' : `/professor/kids/${s.id}`) as never)}
          >
            <LinearGradient colors={[...s.colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
              <Text style={styles.emoji}>{s.emoji}</Text>
              <Text style={styles.title} numberOfLines={2}>{s.title}</Text>
              <Text style={styles.titleTa} numberOfLines={1}>{s.titleTa}</Text>
              {!s.ready ? <Text style={styles.soon}>Soon</Text> : null}
            </LinearGradient>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  featured: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 24 },
  featuredEmoji: { fontSize: 52 },
  featuredKicker: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  featuredTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  featuredText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47.5%', flexGrow: 1 },
  tile: { borderRadius: 22, padding: 16, minHeight: 130, justifyContent: 'flex-end', gap: 2 },
  emoji: { fontSize: 36, position: 'absolute', top: 14, left: 14 },
  title: { color: '#fff', fontSize: 16, fontWeight: '900' },
  titleTa: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  soon: {
    position: 'absolute',
    top: 14,
    right: 12,
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
});

