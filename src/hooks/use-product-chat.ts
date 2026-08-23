import { useCallback, useMemo, useRef, useState } from "react";

import { formatPrice } from "@/components/product-kit";
import { useProductInsights } from "@/hooks/use-product-insights";
import type { Product, ReverseOrderLine, ReviewAnalysisResponse } from "@/lib/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function welcomeText(product: Product): string {
  return `I'm ready to help with ${product.title}. Ask about reviews, returns, pricing, or stock — I'll answer from this product's own data.`;
}

function buildSuggestedPrompts(
  reviewAnalysis: ReviewAnalysisResponse | null,
  returnLines: ReverseOrderLine[],
): string[] {
  if (!reviewAnalysis) {
    return ["What's the price and stock on this item?", "Summarize this listing for me."];
  }

  const prompts = ["How's customer sentiment for this product?"];
  if (returnLines.length > 0) prompts.push("Why are returns high on this item?");
  if (reviewAnalysis.action_plan.length > 0) prompts.push("What should I fix first?");
  return prompts.slice(0, 3);
}

/** Local, deterministic responder grounded in this product's fetched insights/returns — stands in for a real chat endpoint (none exists yet; see ask-tijarah.tsx) without inventing numbers. */
function buildReply(
  question: string,
  product: Product,
  reviewAnalysis: ReviewAnalysisResponse | null,
  returnLines: ReverseOrderLine[],
): string {
  const q = question.toLowerCase();

  if (/return|refund/.test(q)) {
    if (returnLines.length === 0) {
      return `No returns reported for ${product.title} yet — nothing to flag there.`;
    }
    const reasonCounts = new Map<string, number>();
    for (const line of returnLines) {
      const reason = line.reason_text || line.reverse_status || "Unspecified";
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
    const [topReason, topCount] = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const total = returnLines.reduce((sum, line) => sum + (line.refund_amount || 0), 0);
    return `${returnLines.length} ${returnLines.length === 1 ? "return has" : "returns have"} come in for this item, totalling ${formatPrice(total)} refunded. The most common reason is "${topReason}" (${topCount} of them).`;
  }

  if (/draft|reply|respond to/.test(q) && reviewAnalysis?.action_plan.length) {
    const top = reviewAnalysis.action_plan[0];
    return `Here's a starting point:\n\n"Thanks for the feedback on ${product.title} — we're looking into ${top.issue.toLowerCase()} and appreciate you flagging it. We'll make it right."`;
  }

  if (/fix|improve|priorit/.test(q) && reviewAnalysis?.action_plan.length) {
    const top = reviewAnalysis.action_plan[0];
    return `Start with "${top.issue}" — it's ${top.severity} severity across ${top.affected_review_count} reviews. ${top.recommendation}`;
  }

  if (/sentiment|review|rating|feedback/.test(q)) {
    if (!reviewAnalysis) return `I don't have review data for this product yet.`;
    return `Sentiment is ${reviewAnalysis.sentiment_score}/100. ${reviewAnalysis.summary}`;
  }

  if (/price|cost|discount|cheap|expensive/.test(q)) {
    return `${product.title} is listed at ${formatPrice(product.price)}.${
      reviewAnalysis ? ` Sentiment is at ${reviewAnalysis.sentiment_score}/100 — worth checking before changing price.` : ""
    }`;
  }

  if (/stock|inventory|left|quantity/.test(q)) {
    return typeof product.stockQuantity === "number"
      ? `${product.stockQuantity} unit${product.stockQuantity === 1 ? "" : "s"} left in stock.`
      : `I don't have a stock count for this product.`;
  }

  return `I can help with reviews, returns, pricing, and stock for ${product.title}. Try one of the suggestions above, or ask something specific.`;
}

/** Per-product chat: reuses `useProductInsights` so replies are grounded in the same review/return data shown on the Insights tab, and degrades to listing-only answers when that data isn't available (e.g. a manually-added product). */
export function useProductChat(product: Product) {
  const { reviewAnalysis, returns } = useProductInsights(product);
  const returnLines = useMemo(() => returns.flatMap((order) => order.reverseOrderLineDTOList), [returns]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "welcome", role: "assistant", text: welcomeText(product) },
  ]);
  const [isSending, setIsSending] = useState(false);
  const nextId = useRef(0);

  const suggestedPrompts = useMemo(
    () => buildSuggestedPrompts(reviewAnalysis, returnLines),
    [reviewAnalysis, returnLines],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      nextId.current += 1;
      const userMessage: ChatMessage = { id: `u-${nextId.current}`, role: "user", text: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      setTimeout(() => {
        nextId.current += 1;
        const reply = buildReply(trimmed, product, reviewAnalysis, returnLines);
        setMessages((prev) => [...prev, { id: `a-${nextId.current}`, role: "assistant", text: reply }]);
        setIsSending(false);
      }, 400);
    },
    [product, reviewAnalysis, returnLines],
  );

  return { messages, suggestedPrompts, isSending, sendMessage };
}
