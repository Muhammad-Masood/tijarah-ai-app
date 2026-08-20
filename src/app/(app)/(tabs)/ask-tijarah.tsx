import { PlaceholderScreen } from '@/components/placeholder-screen';

// Ask Tijarah is a nav destination, not inline chat (see the Home dashboard
// spec's explicit "do not include" note) — this is a lightweight placeholder
// until the chat experience is built.
export default function AskTijarahScreen() {
  return (
    <PlaceholderScreen
      title="Ask Tijarah"
      description="Chat with Tijarah AI about your stores, orders, and insights — coming soon."
      symbol="sparkles"
      fallbackGlyph="✦"
    />
  );
}
