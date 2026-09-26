import { Audio } from 'expo-av';
import { api } from './api';

export type Transcription = {
  language: 'ta' | 'en' | 'mixed' | 'other';
  original: string;
  english: string;
  tamil: string;
};

/**
 * Small mono AAC in an MP4 container (.m4a) on both platforms keeps a 2-minute clip around 0.5MB
 * (the API caps uploads at 4MB). Gemini reads it directly, and so does the OpenAI speech-to-text
 * fallback, which rejects raw ADTS .aac.
 */
export const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  web: {},
};

export const MAX_RECORDING_MS = 2 * 60 * 1000;

export function transcribe(uri: string) {
  const formData = new FormData();
  formData.append('audio', {
    uri,
    name: 'voice.m4a',
    type: 'audio/mp4',
  } as unknown as Blob);
  return api<Transcription>('/assistant/transcribe', { method: 'POST', formData });
}

export type ProfessorMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** "voice" when the question was spoken */
  source: 'text' | 'voice';
  createdAt: string;
};

/**
 * Ask Professor about the user's own finances. The server answers from their WealthGuard data,
 * adds the saved chat as context, and stores both the question and the answer.
 */
export function askProfessor(question: string, options: { language?: 'en' | 'ta'; source?: 'text' | 'voice' } = {}) {
  return api<{ answer: string; provider: string; messages: ProfessorMessage[] }>('/assistant/ask', {
    method: 'POST',
    body: { question, ...options },
  });
}

/** The saved chat, oldest first (most recent 100 messages). */
export function getProfessorHistory() {
  return api<{ messages: ProfessorMessage[] }>('/assistant/history');
}

export function clearProfessorHistory() {
  return api<void>('/assistant/history', { method: 'DELETE' });
}
