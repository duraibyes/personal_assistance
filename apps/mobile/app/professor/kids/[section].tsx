import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../../components/ui/Screen';
import { Card } from '../../../components/ui/Card';
import { COLORS } from '../../../lib/config';
import { KIDS_SECTIONS } from '../../../lib/kids/sections';

/** Placeholder page for sections whose activities aren't built yet. */
export default function KidsSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const s = KIDS_SECTIONS.find((x) => x.id === section);

  if (!s) {
    return (
      <Screen title="Kids" back>
        <Text style={styles.muted}>Section not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen title={s.title} subtitle={s.titleTa} back>
      <LinearGradient colors={[...s.colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.emoji}>{s.emoji}</Text>
        <Text style={styles.heroTitle}>{s.tagline}</Text>
        <Text style={styles.heroSub}>Coming soon · விரைவில்</Text>
      </LinearGradient>

      <Card>
        <Text style={styles.section}>What you'll find here</Text>
        {s.topics.map((t, i) => (
          <View key={t} style={styles.topic}>
            <View style={[styles.num, { backgroundColor: s.colors[0] }]}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <Text style={styles.topicText}>{t}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 24, alignItems: 'center', gap: 6 },
  emoji: { fontSize: 64 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  section: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  topicText: { color: COLORS.text, fontSize: 15 },
  muted: { color: COLORS.muted },
});
