// lib/useSocket.ts
import { useEffect, useRef, useCallback } from "react";

type MessageHandler = (msg: any) => void;

type Conn = {
  ws: WebSocket | null;
  handlers: Map<string, Set<MessageHandler>>;
  ready: boolean;
  reconnectTimer?: number | null;
};

const CONNS: Map<string, Conn> = new Map();

function ensureConn(url: string): Conn {
  let c = CONNS.get(url);
  if (!c) {
    c = { ws: null, handlers: new Map(), ready: false, reconnectTimer: null };
    CONNS.set(url, c);
  }
  return c;
}

function connectUrl(url: string) {
  const c = ensureConn(url);
  if (c.ws && c.ws.readyState <= 1) return; // already connecting/open

  try {
    const ws = new WebSocket(url);
    c.ws = ws;

    ws.onopen = () => {
      c.ready = true;
      // resubscribe all channels
      for (const channel of c.handlers.keys()) {
        try { ws.send(JSON.stringify({ type: "subscribe", channel })); } catch {}
      }
    };

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { msg = ev.data; }
      // if message has channel dispatch
      const channel = msg?.channel;
      if (channel) {
        const set = c.handlers.get(channel);
        if (set) {
          for (const h of Array.from(set)) {
            try { h(msg); } catch (e) { console.error("ws handler error", e); }
          }
        }
      } else {
        // broadcast to all handlers if no channel provided
        for (const set of c.handlers.values()) {
          for (const h of Array.from(set)) {
            try { h(msg); } catch { /* ignore */ }
          }
        }
      }
    };

    ws.onclose = () => {
      c.ready = false;
      c.ws = null;
      if (c.reconnectTimer) window.clearTimeout(c.reconnectTimer);
      c.reconnectTimer = window.setTimeout(() => connectUrl(url), 1500);
    };

    ws.onerror = () => {
      try { ws.close(); } catch {}
    };
  } catch (err) {
    // schedule reconnect
    if (c.reconnectTimer) window.clearTimeout(c.reconnectTimer);
    c.reconnectTimer = window.setTimeout(() => connectUrl(url), 1500);
  }
}

export function useSocket(url: string) {
  const urlRef = useRef(url);
  urlRef.current = url;

  useEffect(() => {
    connectUrl(urlRef.current);
    return () => {
      // do not close connection here: others may be using it
    };
  }, [url]);

  const subscribe = useCallback((channel: string, handler: MessageHandler) => {
    const c = ensureConn(urlRef.current);
    let set = c.handlers.get(channel);
    if (!set) {
      set = new Set();
      c.handlers.set(channel, set);
    }
    set.add(handler);

    // ensure connected
    connectUrl(urlRef.current);
    if (c.ws && c.ws.readyState === WebSocket.OPEN) {
      try { c.ws.send(JSON.stringify({ type: "subscribe", channel })); } catch {}
    }

    // unsubscribe function
    return () => {
      const s = c.handlers.get(channel);
      if (s) {
        s.delete(handler);
        if (s.size === 0) {
          c.handlers.delete(channel);
          if (c.ws && c.ws.readyState === WebSocket.OPEN) {
            try { c.ws.send(JSON.stringify({ type: "unsubscribe", channel })); } catch {}
          }
        }
      }
    };
  }, [urlRef]);

  return { subscribe };
}
