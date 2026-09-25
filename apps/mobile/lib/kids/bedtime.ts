import stories from './bedtimeStories.json';

export type BedtimeStory = {
  id: string;
  title: string;
  titleTa: string;
  emoji: string;
  summary: string;
  summaryTa: string;
  minutes: number;
  words: number;
  paragraphs: { en: string; ta: string }[];
};

/** Written once with Gemini (simple English + Tamil, ~6–7 min read slowly) and bundled so it works offline. */
export const BEDTIME_STORIES = stories as BedtimeStory[];

export type StoryLanguage = 'en' | 'ta';

/** Slow, calm narration. Android's TTS rate 1.0 is normal speed. */
export const NARRATION = {
  en: { language: 'en-IN', label: 'English' },
  ta: { language: 'ta-IN', label: 'தமிழ்' },
} as const;

export const SPEEDS = [
  { rate: 0.7, label: 'Sleepy' },
  { rate: 0.85, label: 'Calm' },
] as const;
