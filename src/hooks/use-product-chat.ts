import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { formatPrice } from "@/components/product-kit";
import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/hooks/use-auth";
import { useDarazAccessToken } from "@/hooks/use-daraz-access-token";
import type { Product, ReturnsInsights, ReviewAnalysisResponse } from "@/lib/api";

const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

// React Native's WebSocket accepts a third `options.headers` argument that
// carries custom headers over the connect handshake (used to authenticate,
// below) — the DOM lib's WebSocket type doesn't know about it.
const RNWebSocket = WebSocket as unknown as new (
  url: string,
  protocols: undefined,
  options: { headers: Record<string, string> },
) => WebSocket;

type ProductChatEvent =
  | { event: "token"; data: { content: string } }
  | { event: "tool_start"; data: { name?: string; input?: unknown } }
  | { event: "tool_end"; data: { name?: string; output?: unknown } }
  | { event: "done"; data: Record<string, never> }
  | { event: "error"; data: { detail?: string } };

/** Parses a WS frame — JSON object or an SSE-style `event:`/`data:` block. */
function parseProductChatEvent(raw: string): ProductChatEvent | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as ProductChatEvent;
      if (parsed && typeof parsed === "object" && "event" in parsed) return parsed;
    } catch {
      // fall through
    }
  }

  if (!trimmed.includes("event:") || !trimmed.includes("data:")) return null;

  let eventName = "message";
  const dataLines: string[] = [];
  for (const line of trimmed.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;

  const payloadRaw = dataLines.join("\n");
  let data: unknown;
  try {
    data = JSON.parse(payloadRaw);
  } catch {
    try {
      // Backend debug prints sometimes use Python dict syntax — normalize quotes.
      data = JSON.parse(payloadRaw.replace(/'/g, '"'));
    } catch {
      data = payloadRaw;
    }
  }

  return { event: eventName, data } as ProductChatEvent;
}

/** One WS message may carry a JSON object or one/more SSE frames separated by blank lines. */
function parseProductChatEvents(raw: string): ProductChatEvent[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{")) {
    const event = parseProductChatEvent(trimmed);
    return event ? [event] : [];
  }

  if (trimmed.includes("\n\n") && trimmed.includes("event:")) {
    return trimmed
      .split("\n\n")
      .map((frame) => parseProductChatEvent(frame))
      .filter((event): event is ProductChatEvent => event != null);
  }

  const event = parseProductChatEvent(trimmed);
  return event ? [event] : [];
}

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
  returnsInsights: ReturnsInsights | null,
): string[] {
  if (!reviewAnalysis) {
    return ["What's the price and stock on this item?", "Summarize this listing for me."];
  }

  const prompts = ["How's customer sentiment for this product?"];
  if (returnsInsights && returnsInsights.total_units_returned > 0) prompts.push("Why are returns high on this item?");
  if (reviewAnalysis.action_plan.length > 0) prompts.push("What should I fix first?");
  return prompts.slice(0, 3);
}

/**
 * Local, deterministic responder grounded in this product's fetched
 * insights/returns. Used as a fallback where the live agent (below) can't
 * run: on web (browser `WebSocket` can't set the auth headers `WS
 * /reviews/product_chat` requires — native's RN `WebSocket` can, see
 * `RNWebSocket` above) or before a Daraz connection/token is resolved.
 */
function buildReply(
  question: string,
  product: Product,
  reviewAnalysis: ReviewAnalysisResponse | null,
  returnsInsights: ReturnsInsights | null,
): string {
  const q = question.toLowerCase();

  if (/return|refund/.test(q)) {
    if (!returnsInsights || returnsInsights.total_units_returned === 0) {
      return `No returns reported for ${product.title} yet — nothing to flag there.`;
    }
    const [topReason] = [...returnsInsights.return_reason_breakdown].sort((a, b) => b.count - a.count);
    const count = returnsInsights.total_units_returned;
    return `${count} ${count === 1 ? "return has" : "returns have"} come in for this item (${returnsInsights.overall_return_rate}% return rate), totalling ${formatPrice(returnsInsights.total_refund_amount)} refunded.${
      topReason ? ` The most common reason is "${topReason.reason}" (${topReason.count} of them).` : ""
    }`;
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

export function useProductChat(
  product: Product,
  insights: { reviewAnalysis: ReviewAnalysisResponse | null; returnsInsights: ReturnsInsights | null },
) {
  const { reviewAnalysis, returnsInsights } = insights;
  const { accessToken } = useAuth();
  const { darazAccessToken, isConnected } = useDarazAccessToken();

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "welcome", role: "assistant", text: welcomeText(product) },
  ]);
  const [isSending, setIsSending] = useState(false);
  const nextId = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const isReadyRef = useRef(false);
  const pendingMessageRef = useRef<string | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);
  isSendingRef.current = isSending;

  const suggestedPrompts = useMemo(
    () => buildSuggestedPrompts(reviewAnalysis, returnsInsights),
    [reviewAnalysis, returnsInsights],
  );

  const canUseLiveAgent = Platform.OS !== "web" && isConnected && !!accessToken && !!darazAccessToken && !!product.id;

  const appendAssistantChunk = useCallback((content: string) => {
    if (!content) return;

    // Set the streaming id synchronously so rapid back-to-back tokens can't
    // each think they're the first and spawn separate bubbles.
    if (!streamingMessageIdRef.current) {
      nextId.current += 1;
      streamingMessageIdRef.current = `a-${nextId.current}`;
      const id = streamingMessageIdRef.current;
      setMessages((prev) => [...prev, { id, role: "assistant", text: content }]);
      return;
    }

    const id = streamingMessageIdRef.current;
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: m.text + content } : m)),
    );
  }, []);

  const appendAssistantMessage = useCallback((text: string) => {
    streamingMessageIdRef.current = null;
    nextId.current += 1;
    setMessages((prev) => [...prev, { id: `a-${nextId.current}`, role: "assistant", text }]);
  }, []);

  const appendAssistantChunkRef = useRef(appendAssistantChunk);
  const appendAssistantMessageRef = useRef(appendAssistantMessage);
  appendAssistantChunkRef.current = appendAssistantChunk;
  appendAssistantMessageRef.current = appendAssistantMessage;

  // One WS connection (and its server-side agent thread) per chat session,
  // opened once the Daraz connection/tokens are ready and closed when this
  // panel unmounts or the product changes.
  useEffect(() => {
    if (!canUseLiveAgent) return;

    const query = new URLSearchParams({ product_id: product.id! });
    const ws = new RNWebSocket(`${WS_BASE_URL}/reviews/product_chat?${query.toString()}`, undefined, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-daraz-access-token": darazAccessToken!,
      },
    });
    wsRef.current = ws;
    let intentionalClose = false;

    ws.onopen = () => {
      isReadyRef.current = true;
      if (pendingMessageRef.current) {
        ws.send(JSON.stringify({ message: pendingMessageRef.current }));
        pendingMessageRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      const raw = typeof event.data === "string" ? event.data : String(event.data ?? "");
      const events = parseProductChatEvents(raw);
      if (events.length === 0) return;

      for (const parsed of events) {
        if (parsed.event === "token") {
          appendAssistantChunkRef.current(parsed.data.content ?? "");
        } else if (parsed.event === "done") {
          streamingMessageIdRef.current = null;
          setIsSending(false);
        } else if (parsed.event === "error") {
          streamingMessageIdRef.current = null;
          setIsSending(false);
          appendAssistantMessageRef.current(parsed.data.detail ?? "Something went wrong answering that — try again.");
        }
        // tool_start/tool_end: no UI hook for tool activity yet.
      }
    };

    ws.onclose = () => {
      isReadyRef.current = false;
      wsRef.current = null;
      if (!intentionalClose && isSendingRef.current) {
        streamingMessageIdRef.current = null;
        setIsSending(false);
        appendAssistantMessageRef.current("Lost the connection before that finished — try asking again.");
      }
    };

    return () => {
      intentionalClose = true;
      isReadyRef.current = false;
      ws.close();
      wsRef.current = null;
    };
  }, [canUseLiveAgent, product.id, accessToken, darazAccessToken]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      nextId.current += 1;
      const userMessage: ChatMessage = { id: `u-${nextId.current}`, role: "user", text: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      streamingMessageIdRef.current = null;
      setIsSending(true);

      if (canUseLiveAgent) {
        if (isReadyRef.current && wsRef.current) {
          wsRef.current.send(JSON.stringify({ message: trimmed }));
        } else {
          // Socket handshake still in flight — flushed from `onopen` above.
          pendingMessageRef.current = trimmed;
        }
        return;
      }

      setTimeout(() => {
        const reply = buildReply(trimmed, product, reviewAnalysis, returnsInsights);
        appendAssistantMessage(reply);
        setIsSending(false);
      }, 400);
    },
    [canUseLiveAgent, product, reviewAnalysis, returnsInsights, appendAssistantMessage],
  );

  return { messages, suggestedPrompts, isSending, sendMessage };
}
