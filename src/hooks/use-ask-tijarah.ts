import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { ChatMessage } from '@/components/chat-kit';
import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/hooks/use-auth';
import { useDarazAccessToken } from '@/hooks/use-daraz-access-token';
import { useShopifyAccessToken } from '@/hooks/use-shopify-access-token';

const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// React Native's WebSocket accepts a third `options.headers` argument that
// carries custom headers over the connect handshake (used to authenticate,
// below) — the DOM lib's WebSocket type doesn't know about it.
const RNWebSocket = WebSocket as unknown as new (
  url: string,
  protocols: undefined,
  options: { headers: Record<string, string> },
) => WebSocket;

export type SuggestedGroup = {
  label: string;
  prompts: string[];
};

const SUGGESTED_GROUPS: SuggestedGroup[] = [
  { label: 'CATALOG', prompts: ['How many products do I have?', "What's my average price?"] },
  { label: 'STOCK', prompts: ["What's running low on stock?", 'Anything out of stock?'] },
  { label: 'FINANCIALS', prompts: ["What's my revenue this quarter?", 'Show me my top products by orders'] },
];

type TijarahChatEvent =
  | { event: 'connected'; data: { message: string; marketplaces: string[] } }
  | { event: 'tool_start'; data: { name: string; input?: unknown } }
  | { event: 'tool_end'; data: { name: string; output?: unknown } }
  | { event: 'token'; data: { content: string } }
  | { event: 'visualization'; data: { chart_type: string; title: string; plotly_spec: unknown } }
  | { event: 'done'; data: Record<string, never> }
  | { event: 'error'; data: { detail?: string } };

function decodeWebSocketPayload(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return String(data ?? '');
}

/**
 * Minimal parser for Python `repr()`-style literals — the backend sometimes
 * stringifies event payloads as Python dicts (single-quoted strings,
 * True/False/None), which JSON.parse rejects. Returns undefined when the
 * input isn't one complete literal.
 */
function parsePythonLiteral(input: string): unknown {
  let pos = 0;

  const skipWhitespace = () => {
    while (pos < input.length && /\s/.test(input[pos])) pos += 1;
  };

  const parseString = (quote: string): string => {
    pos += 1; // opening quote
    let out = '';
    while (pos < input.length) {
      const ch = input[pos];
      if (ch === '\\') {
        const escaped = input[pos + 1];
        if (escaped === 'n') out += '\n';
        else if (escaped === 't') out += '\t';
        else if (escaped === 'r') out += '\r';
        else out += escaped ?? '';
        pos += 2;
      } else if (ch === quote) {
        pos += 1;
        return out;
      } else {
        out += ch;
        pos += 1;
      }
    }
    throw new Error('unterminated string');
  };

  const parseCollection = (close: '}' | ']' | ')'): Record<string, unknown> | unknown[] => {
    pos += 1; // opening bracket
    const isDict = close === '}';
    const dict: Record<string, unknown> = {};
    const list: unknown[] = [];
    skipWhitespace();
    if (input[pos] === close) {
      pos += 1;
      return isDict ? dict : list;
    }
    while (pos < input.length) {
      const first = parseValue();
      if (isDict) {
        skipWhitespace();
        if (input[pos] !== ':') throw new Error('expected dict separator');
        pos += 1;
        dict[String(first)] = parseValue();
      } else {
        list.push(first);
      }
      skipWhitespace();
      if (input[pos] === ',') {
        pos += 1;
        skipWhitespace();
      } else if (input[pos] === close) {
        pos += 1;
        return isDict ? dict : list;
      } else {
        throw new Error('expected collection separator');
      }
    }
    throw new Error('unterminated collection');
  };

  function parseValue(): unknown {
    skipWhitespace();
    const ch = input[pos];
    if (ch === "'" || ch === '"') return parseString(ch);
    if (ch === '{') return parseCollection('}');
    if (ch === '[') return parseCollection(']');
    if (ch === '(') return parseCollection(')');
    if (input.startsWith('True', pos)) {
      pos += 4;
      return true;
    }
    if (input.startsWith('False', pos)) {
      pos += 5;
      return false;
    }
    if (input.startsWith('None', pos)) {
      pos += 4;
      return null;
    }
    const numeric = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(input.slice(pos));
    if (numeric) {
      pos += numeric[0].length;
      return Number(numeric[0]);
    }
    throw new Error('unrecognized literal');
  }

  try {
    const value = parseValue();
    skipWhitespace();
    return pos >= input.length ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Event payloads arrive as JSON, Python `repr()` literals, or bare text. */
function parseEventPayload(payloadRaw: string): unknown {
  try {
    return JSON.parse(payloadRaw);
  } catch {
    // Not JSON — fall back to the Python-literal parser below.
  }
  return parsePythonLiteral(payloadRaw) ?? payloadRaw;
}

function parseTijarahEvent(raw: string): TijarahChatEvent | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as TijarahChatEvent;
      if (parsed && typeof parsed === 'object' && 'event' in parsed) return parsed;
    } catch {
      // fall through
    }
  }

  let eventName = 'message';
  let payloadRaw = '';

  // The backend emits two SSE-style flavors: standard multi-line frames
  //   event: token
  //   data: {"content": "..."}
  // and a compact single-line form
  //   event: token data:  {'content': '...'}
  const firstLineBreak = trimmed.indexOf('\n');
  const firstLine = firstLineBreak === -1 ? trimmed : trimmed.slice(0, firstLineBreak);
  const singleLine = firstLine.match(/^event:\s*(\S+)\s+data:\s*(.*)$/);

  if (singleLine) {
    eventName = singleLine[1];
    payloadRaw = singleLine[2].trim();
  } else {
    if (!trimmed.includes('event:') || !trimmed.includes('data:')) return null;
    const dataLines: string[] = [];
    for (const line of trimmed.split('\n')) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return null;
    payloadRaw = dataLines.join('\n');
  }

  if (!payloadRaw) return null;
  return { event: eventName, data: parseEventPayload(payloadRaw) } as TijarahChatEvent;
}

/**
 * One WS message may carry several frames: standard SSE separates them with
 * a blank line, while the compact single-line flavor starts each new frame
 * with a newline followed by `event:`.
 */
function splitEventFrames(raw: string): string[] {
  if (raw.includes('\n\n')) return raw.split('\n\n');
  if (raw.includes('\nevent:')) return raw.split(/\n(?=event:)/);
  return [raw];
}

function parseTijarahEvents(raw: string): TijarahChatEvent[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{')) {
    const event = parseTijarahEvent(trimmed);
    return event ? [event] : [];
  }

  return splitEventFrames(trimmed)
    .map((frame) => parseTijarahEvent(frame))
    .filter((event): event is TijarahChatEvent => event != null);
}

/**
 * Store-wide chat for the Ask Tijarah tab. Connects to the Tijarah Chat
 * WebSocket endpoint and streams responses from the multi-marketplace AI
 * agent. Falls back to a local mock when the WebSocket can't be used (web
 * platform or missing tokens).
 */
export function useAskTijarah() {
  const { accessToken } = useAuth();
  const { darazAccessToken, isConnected: isDarazConnected } = useDarazAccessToken();
  const { shopifyAccessToken, isConnected: isShopifyConnected } = useShopifyAccessToken();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Connecting to Tijarah Chat…' },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [marketplaces, setMarketplaces] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<{ name: string; status: 'running' | 'done' }[]>([]);

  const nextId = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const isReadyRef = useRef(false);
  const pendingMessageRef = useRef<string | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamingContentRef = useRef<string>('');
  const streamingVizsRef = useRef<{ chart_type: string; title: string; plotly_spec: unknown }[]>([]);
  const streamingToolsRef = useRef<{ name: string; status: 'running' | 'done' }[]>([]);
  const isSendingRef = useRef(false);
  isSendingRef.current = isSending;

  const canUseLiveAgent =
    Platform.OS !== 'web' && !!accessToken && (isDarazConnected || isShopifyConnected);

  const resolveStreamingVisualizations = useCallback(
    (existing?: ChatMessage['visualizations']) =>
      streamingVizsRef.current.length > 0 ? [...streamingVizsRef.current] : existing,
    [],
  );

  const upsertStreamingMessage = useCallback(
    (messages: ChatMessage[], patch: Partial<ChatMessage> = {}) => {
      let id = streamingMessageIdRef.current ?? undefined;
      let existing = id ? messages.find((m) => m.id === id) : undefined;

      if (!existing) {
        const last = messages[messages.length - 1];
        if (last?.role === 'assistant' && last.isStreaming) {
          id = last.id;
          streamingMessageIdRef.current = id;
          existing = last;
          if (!streamingContentRef.current && last.text) {
            streamingContentRef.current = last.text;
          }
          if (streamingVizsRef.current.length === 0 && last.visualizations?.length) {
            streamingVizsRef.current = [...last.visualizations];
          }
        }
      }

      if (!id) {
        nextId.current += 1;
        id = `a-${nextId.current}`;
        streamingMessageIdRef.current = id;
      }

      if (!existing) {
        return [
          ...messages,
          {
            id,
            role: 'assistant' as const,
            text: streamingContentRef.current,
            isStreaming: true,
            visualizations: resolveStreamingVisualizations(),
            ...patch,
          },
        ];
      }

      return messages.map((m) =>
        m.id === id
          ? {
              ...m,
              text: streamingContentRef.current,
              isStreaming: true,
              visualizations: resolveStreamingVisualizations(m.visualizations),
              ...patch,
            }
          : m,
      );
    },
    [resolveStreamingVisualizations],
  );

  const appendAssistantChunk = useCallback(
    (content: string) => {
      if (!content) return;
      streamingContentRef.current += content;
      setMessages((prev) => upsertStreamingMessage(prev));
    },
    [upsertStreamingMessage],
  );

  const syncStreamingVisualizations = useCallback(() => {
    if (streamingVizsRef.current.length === 0) return;
    setMessages((prev) => upsertStreamingMessage(prev));
  }, [upsertStreamingMessage]);

  const finalizeAssistantMessage = useCallback(() => {
    const finalVizs =
      streamingVizsRef.current.length > 0 ? [...streamingVizsRef.current] : undefined;
    const finalTools =
      streamingToolsRef.current.length > 0 ? [...streamingToolsRef.current] : undefined;

    setMessages((prev) => {
      let id = streamingMessageIdRef.current ?? undefined;
      let target = id ? prev.find((m) => m.id === id) : undefined;

      if (!target) {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.isStreaming) {
          target = last;
          id = last.id;
        }
      }

      if (!target || !id) {
        if (finalVizs) {
          nextId.current += 1;
          return [
            ...prev,
            {
              id: `a-${nextId.current}`,
              role: 'assistant' as const,
              text: '',
              visualizations: finalVizs,
              toolCalls: finalTools,
            },
          ];
        }
        return prev;
      }

      return prev.map((m) =>
        m.id === id
          ? {
              ...m,
              isStreaming: false,
              visualizations: finalVizs ?? m.visualizations,
              toolCalls: finalTools ?? m.toolCalls,
            }
          : m,
      );
    });
    streamingMessageIdRef.current = null;
    streamingContentRef.current = '';
    streamingVizsRef.current = [];
    streamingToolsRef.current = [];
    setActiveToolCalls([]);
    setIsSending(false);
  }, []);

  const appendAssistantMessage = useCallback((text: string) => {
    nextId.current += 1;
    setMessages((prev) => [...prev, { id: `a-${nextId.current}`, role: 'assistant', text }]);
    setIsSending(false);
  }, []);

  const appendAssistantChunkRef = useRef(appendAssistantChunk);
  const syncStreamingVisualizationsRef = useRef(syncStreamingVisualizations);
  const finalizeAssistantMessageRef = useRef(finalizeAssistantMessage);
  const appendAssistantMessageRef = useRef(appendAssistantMessage);
  appendAssistantChunkRef.current = appendAssistantChunk;
  syncStreamingVisualizationsRef.current = syncStreamingVisualizations;
  finalizeAssistantMessageRef.current = finalizeAssistantMessage;
  appendAssistantMessageRef.current = appendAssistantMessage;

  useEffect(() => {
    if (!canUseLiveAgent || !accessToken) return;

    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    if (darazAccessToken) headers['x-daraz-access-token'] = darazAccessToken;
    if (shopifyAccessToken) headers['x-shopify-access-token'] = shopifyAccessToken;

    const ws = new RNWebSocket(`${WS_BASE_URL}/tijarah/ask_tijarah`, undefined, { headers });
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
      try {
        const raw = decodeWebSocketPayload(event.data);
        const events = parseTijarahEvents(raw);
        if (events.length === 0) return;

        for (const parsed of events) {
          switch (parsed.event) {
            case 'connected':
              setIsConnected(true);
              setMarketplaces(parsed.data.marketplaces ?? []);
              setMessages((prev) => {
                // Only replace the initial placeholder — never wipe an active thread.
                if (prev.length === 1 && prev[0]?.id === 'welcome') {
                  return [
                    {
                      id: 'welcome',
                      role: 'assistant',
                      text: parsed.data.message || 'Connected to Tijarah Chat.',
                    },
                  ];
                }
                return prev;
              });
              break;

          case 'tool_start': {
            const name =
              typeof parsed.data.name === 'string' && parsed.data.name ? parsed.data.name : 'Working';
            streamingToolsRef.current.push({ name, status: 'running' });
            setActiveToolCalls([...streamingToolsRef.current]);
            break;
          }

          case 'tool_end': {
            const tool = streamingToolsRef.current.find(
              (t) => t.name === parsed.data.name && t.status === 'running',
            );
            if (tool) tool.status = 'done';
            setActiveToolCalls([...streamingToolsRef.current]);
            break;
          }

          case 'token':
            appendAssistantChunkRef.current(parsed.data.content ?? '');
            break;

          case 'visualization': {
            const viz = parsed.data;
            if (viz && typeof viz === 'object' && viz.plotly_spec) {
              streamingVizsRef.current.push({
                chart_type: typeof viz.chart_type === 'string' ? viz.chart_type : 'line',
                title: typeof viz.title === 'string' ? viz.title : 'Chart',
                plotly_spec: viz.plotly_spec,
              });
              syncStreamingVisualizationsRef.current();
            }
            break;
          }

          case 'done':
            finalizeAssistantMessageRef.current();
            break;

          case 'error':
            streamingMessageIdRef.current = null;
            streamingContentRef.current = '';
            streamingVizsRef.current = [];
            streamingToolsRef.current = [];
            setIsSending(false);
            setActiveToolCalls([]);
            appendAssistantMessageRef.current(
              parsed.data.detail ?? 'Something went wrong — try again.',
            );
            break;
        }
      }
      } catch {
        // Malformed frame — skip rather than tearing down the whole handler.
      }
    };

    ws.onclose = () => {
      isReadyRef.current = false;
      wsRef.current = null;
      setIsConnected(false);
      if (!intentionalClose && isSendingRef.current) {
        // Keep the in-flight bubble and chart refs — a reconnect may resume the turn.
        setIsSending(false);
        setActiveToolCalls([]);
        appendAssistantMessageRef.current('Lost the connection before that finished — try asking again.');
      }
    };

    return () => {
      intentionalClose = true;
      isReadyRef.current = false;
      ws.close();
      wsRef.current = null;
    };
  }, [canUseLiveAgent, accessToken, darazAccessToken, shopifyAccessToken]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      nextId.current += 1;
      const userMessage: ChatMessage = { id: `u-${nextId.current}`, role: 'user', text: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      // Start every turn with clean streaming state so a failed previous turn
      // can't leak its partial charts/tool chips into this one.
      streamingMessageIdRef.current = null;
      streamingContentRef.current = '';
      streamingVizsRef.current = [];
      streamingToolsRef.current = [];
      setActiveToolCalls([]);
      setIsSending(true);

      if (canUseLiveAgent) {
        if (isReadyRef.current && wsRef.current) {
          wsRef.current.send(JSON.stringify({ message: trimmed }));
        } else {
          pendingMessageRef.current = trimmed;
        }
        return;
      }

      // Fallback mock for web or when no marketplace is connected
      setTimeout(() => {
        const reply = !isDarazConnected && !isShopifyConnected
          ? "Connect Daraz or Shopify from the Products tab and I'll answer questions from your real listings."
          : "I can answer catalog and stock questions right now — try one of the suggestions above.";
        appendAssistantMessage(reply);
      }, 400);
    },
    [canUseLiveAgent, isDarazConnected, isShopifyConnected, appendAssistantMessage],
  );

  const resetConversation = useCallback(() => {
    setMessages([{ id: 'welcome', role: 'assistant', text: 'Ask me about your catalog, stock, or financials across all connected marketplaces.' }]);
    setActiveToolCalls([]);
  }, []);

  return {
    messages,
    suggestedGroups: SUGGESTED_GROUPS,
    isConnected,
    marketplaces,
    isSending,
    activeToolCalls,
    sendMessage,
    resetConversation,
  };
}
