import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { api } from './api';

export type Transcription = {
  language: 'ta' | 'en' | 'mixed' | 'other';
  original: string;
  english: string;
  tamil: string;
};

/**
 * Small mono AAC keeps a 2-minute clip around 0.5MB (the API caps uploads at 4MB) and
 * is a format Gemini accepts directly. Android writes raw ADTS AAC; iOS wraps it in MP4.
 */
export const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.aac',
    outputFormat: Audio.AndroidOutputFormat.AAC_ADTS,
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
    name: Platform.OS === 'ios' ? 'voice.m4a' : 'voice.aac',
    type: Platform.OS === 'ios' ? 'audio/mp4' : 'audio/aac',
  } as unknown as Blob);
  return api<Transcription>('/assistant/transcribe', { method: 'POST', formData });
}
