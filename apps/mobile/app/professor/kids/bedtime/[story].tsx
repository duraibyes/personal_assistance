import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { COLORS } from '../../../../lib/config';
import { BEDTIME_STORIES, NARRATION, SPEEDS, StoryLanguage } from '../../../../lib/kids/bedtime';

const MUSIC_VOLUME = 0.14;

export default function StoryPlayer() {
  const { story: storyId } = useLocalSearchParams<{ story: string }>();
  const router = useRouter();
  const story = BEDTIME_STORIES.find((s) => s.id === storyId);

  const [lang, setLang] = useState<StoryLanguage>('en');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [speed, setSpeed] = useState(0);
  const [tamilVoice, setTamilVoice] = useState<boolean | null>(null);

  // Speech callbacks fire later, so they read the latest values from refs rather than stale state.
  const playingRef = useRef(false);
  const indexRef = useRef(0);
  const langRef = useRef<StoryLanguage>('en');
  const speedRef = useRef(0);
  const music = useRef<Audio.Sound | null>(null);
  const scroll = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);

  const total = story?.paragraphs.length ?? 0;

  // Load the looping lullaby once; release it and stop narration when leaving the screen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: false, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(require('../../../../assets/lullaby.wav'), {
        isLooping: true,
        volume: MUSIC_VOLUME,
      });
      if (cancelled) sound.unloadAsync();
      else music.current = sound;
    })().catch(() => undefined);
    Speech.getAvailableVoicesAsync()
      .then((voices) => setTamilVoice(voices.some((v) => v.language?.toLowerCase().startsWith('ta'))))
      .catch(() => setTamilVoice(null));
    return () => {
      cancelled = true;
      playingRef.current = false;
      Speech.stop();
      music.current?.unloadAsync();
    };
  }, []);

  const fadeOutMusic = useCallback(async () => {
    const sound = music.current;
    if (!sound) return;
    for (let v = MUSIC_VOLUME; v > 0; v -= 0.01) {
      await sound.setVolumeAsync(Math.max(0, v)).catch(() => undefined);
      await new Promise((r) => setTimeout(r, 350));
    }
    await sound.pauseAsync().catch(() => undefined);
    await sound.setVolumeAsync(MUSIC_VOLUME).catch(() => undefined);
  }, []);

  const speakFrom = useCallback(
    (i: number) => {
      if (!story) return;
      if (i >= story.paragraphs.length) {
        playingRef.current = false;
        setPlaying(false);
        setFinished(true);
        fadeOutMusic();
        return;
      }
      indexRef.current = i;
      setIndex(i);
      const y = offsets.current[i];
      if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });

      const l = langRef.current;
      Speech.speak(story.paragraphs[i][l], {
        language: NARRATION[l].language,
        rate: SPEEDS[speedRef.current].rate,
        pitch: 0.95,
        onDone: () => {
          // A short breath between paragraphs keeps the pace sleepy.
          if (playingRef.current) setTimeout(() => playingRef.current && speakFrom(indexRef.current + 1), 900);
        },
        onError: () => {
          playingRef.current = false;
          setPlaying(false);
        },
      });
    },
    [story, fadeOutMusic]
  );

  const play = (from = indexRef.current) => {
    setFinished(false);
    playingRef.current = true;
    setPlaying(true);
    if (musicOn) music.current?.playAsync().catch(() => undefined);
    speakFrom(from);
  };

  /** Android TTS can't pause mid-sentence, so pausing stops and play restarts the current paragraph. */
  const pause = () => {
    playingRef.current = false;
    setPlaying(false);
    Speech.stop();
    music.current?.pauseAsync().catch(() => undefined);
  };

  const jump = (i: number) => {
    const next = Math.max(0, Math.min(total - 1, i));
    Speech.stop();
    indexRef.current = next;
    setIndex(next);
    if (playingRef.current) setTimeout(() => speakFrom(next), 150);
    else {
      const y = offsets.current[next];
      if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
    }
  };

  const switchLang = (l: StoryLanguage) => {
    if (l === langRef.current) return;
    langRef.current = l;
    setLang(l);
    if (playingRef.current) {
      Speech.stop();
      setTimeout(() => speakFrom(indexRef.current), 150);
    }
  };

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    if (!next) music.current?.pauseAsync().catch(() => undefined);
    else if (playingRef.current) music.current?.playAsync().catch(() => undefined);
  };

  const toggleSpeed = () => {
    const next = (speedRef.current + 1) % SPEEDS.length;
    speedRef.current = next;
    setSpeed(next);
  };

  if (!story) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.muted}>Story not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0b0a2a', '#1e1b4b', '#2e1065']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{story.emoji} {lang === 'en' ? story.title : story.titleTa}</Text>
            <Text style={styles.muted}>≈ {story.minutes} min · {index + 1} / {total}</Text>
          </View>
        </View>

        <View style={styles.langRow}>
          {(['en', 'ta'] as const).map((l) => (
            <Pressable key={l} onPress={() => switchLang(l)} style={[styles.lang, lang === l && styles.langActive]}>
              <Text style={[styles.langText, lang === l && styles.langTextActive]}>{NARRATION[l].label}</Text>
            </Pressable>
          ))}
        </View>
        {lang === 'ta' && tamilVoice === false ? (
          <Text style={styles.voiceHint}>
            No Tamil voice found on this phone. Install it: Settings → Google Text-to-speech → Install voice data → Tamil.
          </Text>
        ) : null}

        <ScrollView ref={scroll} contentContainerStyle={styles.text}>
          {story.paragraphs.map((p, i) => (
            <Pressable
              key={i}
              onPress={() => jump(i)}
              onLayout={(e) => {
                offsets.current[i] = e.nativeEvent.layout.y;
              }}
            >
              <Text style={[styles.paragraph, i === index ? styles.current : i < index ? styles.read : null]}>{p[lang]}</Text>
            </Pressable>
          ))}
          {finished ? <Text style={styles.goodnight}>{lang === 'en' ? 'Good night, sweet dreams 🌙' : 'இனிய இரவு, இனிய கனவுகள் 🌙'}</Text> : null}
        </ScrollView>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((index + (finished ? 1 : 0)) / total) * 100}%` }]} />
        </View>

        <View style={styles.controls}>
          <Pressable onPress={toggleMusic} style={styles.small} hitSlop={6}>
            <Ionicons name={musicOn ? 'musical-notes' : 'musical-notes-outline'} size={20} color={musicOn ? '#c4b5fd' : COLORS.muted} />
            <Text style={styles.smallText}>{musicOn ? 'Music' : 'No music'}</Text>
          </Pressable>
          <Pressable onPress={() => jump(index - 1)} hitSlop={8}>
            <Ionicons name="play-skip-back" size={28} color="#e9d5ff" />
          </Pressable>
          <Pressable onPress={() => (playing ? pause() : play(finished ? 0 : index))} style={styles.playBtn}>
            <Ionicons name={playing ? 'pause' : 'play'} size={34} color="#fff" style={playing ? undefined : { marginLeft: 4 }} />
          </Pressable>
          <Pressable onPress={() => jump(index + 1)} hitSlop={8}>
            <Ionicons name="play-skip-forward" size={28} color="#e9d5ff" />
          </Pressable>
          <Pressable onPress={toggleSpeed} style={styles.small} hitSlop={6}>
            <Ionicons name="speedometer-outline" size={20} color="#c4b5fd" />
            <Text style={styles.smallText}>{SPEEDS[speed].label}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0a2a' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  back: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  muted: { color: '#a5a3c9', fontSize: 12 },
  langRow: { flexDirection: 'row', marginHorizontal: 16, padding: 4, gap: 4, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  lang: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  langActive: { backgroundColor: '#7c3aed' },
  langText: { color: '#c4b5fd', fontWeight: '700' },
  langTextActive: { color: '#fff' },
  voiceHint: { color: '#fcd34d', fontSize: 12, marginHorizontal: 16, marginTop: 8 },
  text: { padding: 20, paddingBottom: 40, gap: 16 },
  paragraph: { color: 'rgba(233,213,255,0.55)', fontSize: 18, lineHeight: 30 },
  current: { color: '#fff', backgroundColor: 'rgba(124,58,237,0.25)', borderRadius: 12, padding: 8, marginHorizontal: -8 },
  read: { color: 'rgba(233,213,255,0.35)' },
  goodnight: { color: '#fde68a', fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20 },
  progressFill: { height: '100%', backgroundColor: '#a78bfa' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 16 },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  small: { alignItems: 'center', gap: 3, width: 64 },
  smallText: { color: '#c4b5fd', fontSize: 10, fontWeight: '700' },
});
