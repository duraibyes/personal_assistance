export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://wealthguard-api.vercel.app/api';

export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || 'https://wealthguard-web.vercel.app';

/** Palette taken from the WealthGuard shield logo: navy body, blue→green rim, gold coins. */
export const COLORS = {
  bg: '#051634',
  card: 'rgba(12, 36, 84, 0.72)',
  cardSolid: '#0b2150',
  border: 'rgba(92, 140, 255, 0.22)',
  text: '#f1f5ff',
  muted: '#9fb0d4',
  primary: '#2f7bff',
  primaryText: '#ffffff',
  green: '#3ddc5f',
  teal: '#14b8a6',
  gold: '#f5a524',
  danger: '#f43f5e',
  success: '#34d399',
  warning: '#f5a524',
  inputBg: 'rgba(3, 14, 38, 0.8)',
};

/** Screen background: logo navy fading into the teal of the hand. */
export const BG_GRADIENT = ['#0a2766', '#051634', '#03262c'] as const;

/** Brand accent: the blue→green sweep of the shield rim. */
export const BRAND_GRADIENT = ['#1f6bff', '#16b87a'] as const;

export function formatINR(amount: number | null | undefined) {
  const n = Number(amount || 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
