import { Redirect } from 'expo-router';

/** Placeholder for the tab bar's Ask button, which opens Professor → Ask as a full screen. */
export default function AskTab() {
  return <Redirect href="/professor/ask" />;
}
