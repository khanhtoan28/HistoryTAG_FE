import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  getNotifications as apiGetNotifications,
  getUnreadCount as apiGetUnreadCount,
  markAsRead as apiMarkAsRead,
} from "../api/notification.api";
import { getAuthToken } from "../api/client";

// Optional STOMP support
let StompClient: any | null = null;
let SockJSClient: any | null = null;
// try {
//   // dynamically require so tests/other environments without the deps won't crash
//   // eslint-disable-next-line @typescript-eslint/no-var-requires
//   StompClient = require("@stomp/stompjs").Client;
//   // eslint-disable-next-line @typescript-eslint/no-var-requires
//   SockJSClient = require("sockjs-client");
// } catch {
//   StompClient = null;
//   SockJSClient = null;
// }

type Notification = any;

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  loadNotifications: (limit?: number) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const useNotification = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const esRef = useRef<EventSource | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadNotifications = async (limit = 50) => {
    try {
      const list = await apiGetNotifications(limit);
      setNotifications(list || []);
    } catch {
      // ignore
    }
  };

  const loadUnread = async () => {
    try {
      const c = await apiGetUnreadCount();
      setUnreadCount(c || 0);
    } catch {
      // ignore
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await apiMarkAsRead(id);
    } catch {
      // ignore server error but still update UI optimistically
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  useEffect(() => {
    // initial load
    loadUnread();
    loadNotifications(20);

    // choose connection strategy: STOMP (preferred) -> SSE -> WebSocket -> polling
    const stompUrl = import.meta.env.VITE_NOTIFICATION_STOMP_URL as string | undefined;
    const stompDest = (import.meta.env.VITE_NOTIFICATION_STOMP_DEST as string | undefined) || "/user/queue/notifications";
    const sseUrl = import.meta.env.VITE_NOTIFICATION_SSE_URL as string | undefined;
    const wsUrl = import.meta.env.VITE_NOTIFICATION_WS_URL as string | undefined;
    const token = getAuthToken();

    let reconnectAttempts = 0;

    const attemptReconnect = () => {
      reconnectAttempts += 1;
      const wait = Math.min(30000, 1000 * Math.pow(2, Math.min(reconnectAttempts, 6)));
      window.setTimeout(() => {
        if (esRef.current || wsRef.current) return;
        if (sseUrl) trySSE();
        if (wsUrl) tryWS();
      }, wait);
    };

    const trySSE = () => {
      if (!sseUrl) return false;
      try {
        const url = token ? `${sseUrl}${sseUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : sseUrl;
        const es = new EventSource(url as string);
        esRef.current = es;

        es.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            handlePayload(payload as any);
          } catch {
            // ignore
          }
        };

        es.onerror = () => {
          try { es.close(); } catch { /* ignore */ }
          esRef.current = null;
          attemptReconnect();
        };

        return true;
      } catch {
        return false;
      }
    };

    const tryWS = () => {
      if (!wsUrl) return false;
      try {
        const url = token ? `${wsUrl}${wsUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : wsUrl;
        const ws = new WebSocket(url as string);
        wsRef.current = ws;

        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            handlePayload(payload as any);
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          attemptReconnect();
        };
        ws.onerror = () => {
          try { ws.close(); } catch { /* ignore */ }
          wsRef.current = null;
          attemptReconnect();
        };

        return true;
      } catch {
        return false;
      }
    };

    const tryStomp = () => {
      if (!stompUrl || !StompClient) return false;
      try {
        const url = stompUrl as string;
        // create client; use SockJS if available
        const client = StompClient
          ? new StompClient({
              webSocketFactory: SockJSClient ? () => new SockJSClient(url) : undefined,
              connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
              reconnectDelay: 5000,
              debug: () => {},
            })
          : null;

        if (!client) return false;

        client.onConnect = () => {
          try {
            client.subscribe(stompDest, (msg: any) => {
              if (msg.body) {
                try {
                  const payload = JSON.parse(msg.body);
                  handlePayload(payload as any);
                } catch {
                  // ignore
                }
              }
            });
          } catch {
            // ignore
          }
        };

        client.onStompError = (frame: any) => {
          console.debug("STOMP error", frame);
        };

        client.activate();
        return true;
      } catch {
        return false;
      }
    };

    const handlePayload = (payload: any) => {
      if (!payload) return;
      if (payload.type === "notification") {
        setNotifications((prev) => [payload.data, ...prev]);
        setUnreadCount((c) => c + 1);
      } else if (payload.type === "unread-count") {
        setUnreadCount(payload.data || 0);
      } else if (payload.type === "refresh") {
        loadNotifications(50);
        loadUnread();
      } else if (payload.id) {
        setNotifications((prev) => [payload, ...prev]);
        setUnreadCount((c) => c + 1);
      }
    };

    // prefer STOMP -> SSE -> WS -> polling
    let connected = false;
    if (stompUrl) connected = tryStomp();
    if (!connected && sseUrl) connected = trySSE();
    if (!connected && wsUrl) connected = tryWS();

    let pollInterval: number | null = null;
    if (!connected) {
      loadUnread();
      pollInterval = window.setInterval(() => {
        loadUnread();
      }, 10000);
    }

    return () => {
      if (esRef.current) {
        try { esRef.current.close(); } catch { /* ignore */ }
        esRef.current = null;
      }
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }
      if (pollInterval) window.clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    loadNotifications,
    markAsRead,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export default NotificationContext;
