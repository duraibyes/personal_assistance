import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../../../components/ui/Screen';
import { COLORS } from '../../../../lib/config';
import { BEDTIME_STORIES } from '../../../../lib/kids/bedtime';

const FEATURES = [
  { icon: 'time-outline' as const, text: '5–10 minutes' },
  { icon: 'mic-outline' as const, text: 'Slow narration' },
  { icon: 'musical-notes-outline' as const, text: 'Soft music' },
  { icon: 'language-outline' as const, text: 'English & தமிழ்' },
];

export default function BedtimeList() {
  const router = useRouter();
  return (
    <Screen title="Bedtime Stories" subtitle="உறங்கும் நேரக் கதைகள்" back>
      <LinearGradient colors={['#1e1b4b', '#4c1d95']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.moon}>🌙✨</Text>
        <Text style={styles.heroTitle}>Calm, short stories before sleeping</Text>
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.feature}>
              <Ionicons name={f.icon} size={13} color="#e9d5ff" />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {BEDTIME_STORIES.map((story) => (
        <Pressable
          key={story.id}
          onPress={() => router.push(`/professor/kids/bedtime/${story.id}`)}
          style={({ pressed }) => [styles.story, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{story.emoji}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title}>{story.title}</Text>
            <Text style={styles.titleTa}>{story.titleTa}</Text>
            <Text style={styles.summary} numberOfLines={2}>{story.summary}</Text>
            <Text style={styles.meta}>≈ {story.minutes} min</Text>
          </View>
          <View style={styles.play}>
            <Ionicons name="play" size={18} color="#fff" />
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 20, gap: 10 },
  moon: { fontSize: 36 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  featureText: { color: '#f3e8ff', fontSize: 11, fontWeight: '700' },
  story: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    backgroundColor: 'rgba(49,46,129,0.45)',
  },
  emojiWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(167,139,250,0.2)', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 30 },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  titleTa: { color: '#c4b5fd', fontSize: 12 },
  summary: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  meta: { color: '#c4b5fd', fontSize: 11, fontWeight: '700', marginTop: 2 },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
});
