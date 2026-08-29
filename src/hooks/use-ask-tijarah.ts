import { useCallback, useRef, useState } from 'react';

import type { ChatMessage } from '@/components/chat-kit';
import { formatPrice, getStockLevel } from '@/components/product-kit';
import type { Product } from '@/lib/api';

export type SuggestedGroup = {
  label: string;
  prompts: string[];
};

/**
 * What this screen can honestly ground answers in today: the merchant's
 * connected product catalog (`useDarazProducts`) — the only store-wide data
 * hook that exists yet. No Orders/Forecasts group is offered because no
 * hook backs one; the fallback reply below points to the per-product chat
 * (`useProductChat`) for reviews/returns instead of pretending to cover them.
 */
const SUGGESTED_GROUPS: SuggestedGroup[] = [
  { label: 'CATALOG', prompts: ['How many products do I have?', "What's my average price?"] },
  { label: 'STOCK', prompts: ["What's running low on stock?", 'Anything out of stock?'] },
];

function welcomeText(isConnected: boolean): string {
  if (!isConnected) {
    return "Connect Daraz from the Products tab and I'll answer catalog and stock questions from your real listings.";
  }
  return 'Ask me about your catalog — stock levels and pricing across every connected store.';
}

function buildReply(question: string, products: Product[], isConnected: boolean, isLoading: boolean): string {
  if (!isConnected) {
    return "I don't have a connected store to check yet — connect Daraz from the Products tab first.";
  }
  if (isLoading) {
    return 'Still loading your catalog — ask again in a moment.';
  }
  if (products.length === 0) {
    return 'Your connected catalog is empty right now — nothing to report on yet.';
  }

  const q = question.toLowerCase();

  if (/how many|count|catalog size/.test(q)) {
    return `You have ${products.length} product${products.length === 1 ? '' : 's'} listed right now.`;
  }

  if (/average|avg|price range|how much/.test(q)) {
    const prices = products.map((product) => product.price).filter((price) => price > 0);
    if (prices.length === 0) return "None of your listings have a price set yet.";
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return `Average listed price is ${formatPrice(avg)}, ranging from ${formatPrice(Math.min(...prices))} to ${formatPrice(Math.max(...prices))}.`;
  }

  if (/out of stock/.test(q)) {
    const outOfStock = products.filter((product) => getStockLevel(product.stockQuantity) === 'out');
    if (outOfStock.length === 0) return 'Nothing is out of stock right now.';
    const names = outOfStock.slice(0, 3).map((product) => product.title).join(', ');
    return `${outOfStock.length} product${outOfStock.length === 1 ? ' is' : 's are'} out of stock: ${names}${outOfStock.length > 3 ? ', and more' : ''}.`;
  }

  if (/low stock|running low|restock/.test(q)) {
    const low = products.filter((product) => getStockLevel(product.stockQuantity) === 'low');
    if (low.length === 0) return 'Nothing is critically low — stock looks healthy.';
    const names = low.slice(0, 3).map((product) => `${product.title} (${product.stockQuantity})`).join(', ');
    return `${low.length} product${low.length === 1 ? ' is' : 's are'} running low: ${names}${low.length > 3 ? ', and more' : ''}.`;
  }

  return "I can answer catalog and stock questions right now — try one of the suggestions above, or open a product's own page to ask about its reviews and returns.";
}

/**
 * Store-wide chat for the Ask Tijarah tab. A local, deterministic responder
 * grounded in the merchant's real connected catalog (same honest-mock
 * pattern as `useProductChat`) — no real chat endpoint exists yet.
 */
export function useAskTijarah(products: Product[], isConnected: boolean, isLoading: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'welcome', role: 'assistant', text: welcomeText(isConnected) },
  ]);
  const [isSending, setIsSending] = useState(false);
  const nextId = useRef(0);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      nextId.current += 1;
      const userMessage: ChatMessage = { id: `u-${nextId.current}`, role: 'user', text: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      setTimeout(() => {
        nextId.current += 1;
        const reply = buildReply(trimmed, products, isConnected, isLoading);
        setMessages((prev) => [...prev, { id: `a-${nextId.current}`, role: 'assistant', text: reply }]);
        setIsSending(false);
      }, 400);
    },
    [products, isConnected, isLoading],
  );

  const resetConversation = useCallback(() => {
    setMessages([{ id: 'welcome', role: 'assistant', text: welcomeText(isConnected) }]);
  }, [isConnected]);

  return { messages, suggestedGroups: SUGGESTED_GROUPS, isSending, sendMessage, resetConversation };
}
