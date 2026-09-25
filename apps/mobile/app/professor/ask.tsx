import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { GradientBackground } from '../components/ui/Screen';
import { Logo } from '../components/ui/Bits';
import { BRAND_GRADIENT, COLORS } from '../lib/config';
import { pickDocument } from '../lib/documents';
import { MAX_RECORDING_MS, RECORDING_OPTIONS, transcribe, Transcription } from '../lib/assistant';

type Voice = {
  uri: string;
  durationMs: number;
  status: 'transcribing' | 'done' | 'error';
  result?: Transcription;
  error?: string;
};

type Message = {
  id: string;
  from: 'me' | 'professor';
  text?: string;
  file?: { name: string; size?: number | null };
  voice?: Voice;
};

const LANGUAGE_LABEL: Record<Transcription['language'], string> = {
  ta: 'Spoken in Tamil',
  en: 'Spoken in English',
  mixed: 'Tamil + English',
  other: 'Detected speech',
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const WELCOME: Message = {
  id: 'welcome',
  from: 'professor',
  text: 'Vanakkam! Tap the mic and speak in Tamil or English. I will write it out in English first, and in Tamil on the next tab.',
};

export default function ProfessorScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Message>>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<DocumentPickerAsset | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  const canSend = text.trim().length > 0 || !!attachment;

  useEffect(() => {
    if (!recording) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.35, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [recording, pulse]);

  // Never leave the microphone open if the user backs out mid-recording.
  useEffect(() => () => void recordingRef.current?.stopAndUnloadAsync().catch(() => undefined), []);

  const push = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };
  const patchVoice = (id: string, voice: Partial<Voice>) =>
    setMessages((prev) => prev.map((m) => (m.id === id && m.voice ? { ...m, voice: { ...m.voice, ...voice } } : m)));

  const sendText = () => {
    if (!canSend) return;
    push({
      id: uid(),
      from: 'me',
      text: text.trim() || undefined,
      file: attachment ? { name: attachment.name, size: attachment.size } : undefined,
    });
    setText('');
    setAttachment(null);
  };

  const attach = async () => {
    const file = await pickDocument();
    if (file) setAttachment(file);
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setMicError('Microphone permission is needed to record. Enable it in Settings → Apps → WealthGuard.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS,
        (status) => {
          if (!status.isRecording) return;
          setElapsed(status.durationMillis);
          // Metering is dBFS (-160…0); map the useful -60…0 range to 0…1 for the level bar.
          if (status.metering !== undefined) setLevel(Math.max(0, Math.min(1, (status.metering + 60) / 60)));
          if (status.durationMillis >= MAX_RECORDING_MS) stopRecording(true);
        },
        200
      );
      recordingRef.current = rec;
      setElapsed(0);
      setRecording(true);
    } catch (err) {
      setMicError(err instanceof Error ? err.message : 'Could not start recording');
    }
  };

  const stopRecording = async (send: boolean) => {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    setRecording(false);
    setLevel(0);
    try {
      const status = await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      const durationMs = status.durationMillis ?? elapsed;
      if (!send || !uri) return;
      if (durationMs < 700) {
        setMicError('That was too short — tap the mic and speak, then tap send.');
        return;
      }
      const id = uid();
      push({ id, from: 'me', voice: { uri, durationMs, status: 'transcribing' } });
      runTranscription(id, uri);
    } catch (err) {
      setMicError(err instanceof Error ? err.message : 'Recording failed');
    }
  };

  const runTranscription = async (id: string, uri: string) => {
    patchVoice(id, { status: 'transcribing', error: undefined });
    try {
      const result = await transcribe(uri);
      patchVoice(id, { status: 'done', result });
    } catch (err) {
      patchVoice(id, { status: 'error', error: err instanceof Error ? err.message : 'Transcription failed' });
    }
  };

  return (
    <View style={styles.root}>
      <GradientBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </Pressable>
          <Logo size={34} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Professor</Text>
            <Text style={styles.subtitle}>Speak in Tamil or English</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <Bubble
                message={item}
                onRetry={() => item.voice && runTranscription(item.id, item.voice.uri)}
                onUseText={(value) => setText(value)}
              />
            )}
          />

          {micError ? (
            <Pressable onPress={() => setMicError(null)} style={styles.micError}>
              <Ionicons name="alert-circle" size={16} color="#fda4af" />
              <Text style={styles.micErrorText}>{micError}</Text>
            </Pressable>
          ) : null}

          {attachment ? (
            <View style={styles.attachChip}>
              <Ionicons name="document-attach-outline" size={16} color={COLORS.primary} />
              <Text style={styles.attachName} numberOfLines={1}>{attachment.name}</Text>
              <Pressable onPress={() => setAttachment(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={COLORS.muted} />
              </Pressable>
            </View>
          ) : null}

          {recording ? (
            <View style={styles.bar}>
              <Pressable onPress={() => stopRecording(false)} style={styles.roundBtn} hitSlop={6}>
                <Ionicons name="trash-outline" size={20} color="#fb7185" />
              </Pressable>
              <View style={styles.recording}>
                <Animated.View style={[styles.recDot, { transform: [{ scale: pulse }] }]} />
                <Text style={styles.recTime}>{clock(elapsed)}</Text>
                <View style={styles.levelTrack}>
                  <View style={[styles.levelFill, { width: `${Math.max(4, level * 100)}%` }]} />
                </View>
                <Text style={styles.recHint}>max {clock(MAX_RECORDING_MS)}</Text>
              </View>
              <SendButton icon="send" onPress={() => stopRecording(true)} />
            </View>
          ) : (
            <View style={styles.bar}>
              <Pressable onPress={attach} style={styles.roundBtn} hitSlop={6}>
                <Ionicons name="attach" size={22} color={COLORS.muted} />
              </Pressable>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Message Professor…"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                multiline
              />
              {canSend ? <SendButton icon="send" onPress={sendText} /> : <SendButton icon="mic" onPress={startRecording} />}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function SendButton({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.sendBtn, { opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient colors={[...BRAND_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Ionicons name={icon} size={20} color="#fff" />
    </Pressable>
  );
}

function Bubble({ message, onRetry, onUseText }: { message: Message; onRetry: () => void; onUseText: (value: string) => void }) {
  const mine = message.from === 'me';
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {message.file ? (
          <View style={styles.fileRow}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.text} />
            <Text style={styles.fileName} numberOfLines={1}>{message.file.name}</Text>
          </View>
        ) : null}
        {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
        {message.voice ? <VoiceBody voice={message.voice} onRetry={onRetry} onUseText={onUseText} /> : null}
      </View>
    </View>
  );
}

function VoiceBody({ voice, onRetry, onUseText }: { voice: Voice; onRetry: () => void; onUseText: (value: string) => void }) {
  const [tab, setTab] = useState<'english' | 'tamil'>('english');

  const header = (
    <View style={styles.voiceHead}>
      <Ionicons name="mic" size={14} color={COLORS.text} />
      <Text style={styles.voiceMeta}>Voice · {clock(voice.durationMs)}</Text>
      {voice.result ? <Text style={styles.voiceMeta}>· {LANGUAGE_LABEL[voice.result.language]}</Text> : null}
    </View>
  );

  if (voice.status === 'transcribing') {
    return (
      <View style={{ gap: 8 }}>
        {header}
        <View style={styles.fileRow}>
          <ActivityIndicator size="small" color={COLORS.text} />
          <Text style={styles.voiceMeta}>Converting to English & Tamil…</Text>
        </View>
      </View>
    );
  }

  if (voice.status === 'error' || !voice.result) {
    return (
      <View style={{ gap: 8 }}>
        {header}
        <Text style={styles.voiceError}>{voice.error || 'Transcription failed'}</Text>
        <Pressable onPress={onRetry} style={styles.retry}>
          <Ionicons name="refresh" size={14} color={COLORS.text} />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const value = tab === 'english' ? voice.result.english : voice.result.tamil;
  const empty = !voice.result.english && !voice.result.tamil;

  return (
    <View style={{ gap: 8 }}>
      {header}
      {empty ? (
        <Text style={styles.voiceMeta}>No speech detected. Try again a little closer to the mic.</Text>
      ) : (
        <>
          <View style={styles.tabs}>
            {(['english', 'tamil'] as const).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'english' ? 'English' : 'தமிழ்'}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.text} selectable>{value || '—'}</Text>
          {voice.result.language === 'mixed' && voice.result.original ? (
            <Text style={styles.original} selectable>Heard: {voice.result.original}</Text>
          ) : null}
          <Pressable onPress={() => onUseText(value)} style={styles.retry}>
            <Ionicons name="create-outline" size={14} color={COLORS.text} />
            <Text style={styles.retryText}>Edit & send as text</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(47,123,255,0.15)' },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  subtitle: { color: COLORS.muted, fontSize: 12 },
  list: { padding: 16, gap: 10 },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', borderRadius: 18, padding: 12, gap: 6 },
  bubbleMine: { backgroundColor: '#1f5fd6', borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: COLORS.cardSolid, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 6 },
  text: { color: COLORS.text, fontSize: 15, lineHeight: 21 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileName: { color: COLORS.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  voiceHead: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  voiceMeta: { color: 'rgba(241,245,255,0.8)', fontSize: 12 },
  voiceError: { color: '#fecdd3', fontSize: 13 },
  original: { color: 'rgba(241,245,255,0.7)', fontSize: 12, fontStyle: 'italic' },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 3, gap: 3 },
  tab: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  tabText: { color: 'rgba(241,245,255,0.7)', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  retryText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  micError: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(244,63,94,0.15)',
  },
  micErrorText: { color: '#fda4af', fontSize: 12, flex: 1 },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  attachName: { color: COLORS.text, fontSize: 13, flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: 'rgba(4,17,43,0.85)',
  },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(159,176,212,0.12)' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    color: COLORS.text,
    fontSize: 15,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  recording: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.35)',
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f43f5e' },
  recTime: { color: COLORS.text, fontWeight: '800', fontVariant: ['tabular-nums'] },
  levelTrack: { flex: 1, height: 4, borderRadius: 999, backgroundColor: 'rgba(159,176,212,0.2)', overflow: 'hidden' },
  levelFill: { height: '100%', borderRadius: 999, backgroundColor: '#fb7185' },
  recHint: { color: COLORS.muted, fontSize: 10 },
});
