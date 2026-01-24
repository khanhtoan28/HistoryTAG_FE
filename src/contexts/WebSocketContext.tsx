import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAuthToken } from '../api/client';

interface WebSocketContextType {
  subscribe: (destination: string, callback: (message: any) => void) => () => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<{ [key: string]: ((message: any) => void)[] }>({});

  const connect = useCallback(() => {
    try {
      const token = getAuthToken();
      if (!token) {
        // Không có token thì không kết nối (chưa login)
        return;
      }

      // Nếu đã có client đang kết nối, không tạo mới
      if (clientRef.current?.connected || clientRef.current?.active) {
        return;
      }

      const stompUrl = import.meta.env.VITE_NOTIFICATION_STOMP_URL || '/ws';
      const urlWithToken = `${stompUrl}${stompUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;

      const client = new Client({
        webSocketFactory: () => {
          try {
            return new SockJS(urlWithToken);
          } catch (err) {
            console.error('Failed to create SockJS connection:', err);
            throw err;
          }
        },
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
          setIsConnected(true);
          // Resubscribe to all existing destinations
          Object.keys(subscriptionsRef.current).forEach((dest) => {
            try {
              client.subscribe(dest, (message) => {
                try {
                  const payload = JSON.parse(message.body);
                  subscriptionsRef.current[dest].forEach((cb) => {
                    try {
                      cb(payload);
                    } catch (err) {
                      console.error('Error in WebSocket callback:', err);
                    }
                  });
                } catch (err) {
                  console.error('Error parsing WebSocket message:', err);
                }
              });
            } catch (err) {
              console.error('Error subscribing to destination:', dest, err);
            }
          });
        },
        onDisconnect: () => {
          setIsConnected(false);
        },
        onStompError: (frame) => {
          console.error('STOMP error', frame);
          setIsConnected(false);
        },
        onWebSocketClose: () => {
          setIsConnected(false);
        },
      });

      client.activate();
      clientRef.current = client;
    } catch (err) {
      console.error('Failed to initialize WebSocket connection:', err);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    // Chỉ kết nối khi có token
    const token = getAuthToken();
    if (token) {
      connect();
    }
    
    return () => {
      if (clientRef.current) {
        try {
          clientRef.current.deactivate();
        } catch (err) {
          console.error('Error deactivating WebSocket client:', err);
        }
        clientRef.current = null;
      }
    };
  }, [connect]);

  const subscribe = useCallback((destination: string, callback: (message: any) => void) => {
    if (!subscriptionsRef.current[destination]) {
      subscriptionsRef.current[destination] = [];
    }
    subscriptionsRef.current[destination].push(callback);

    let subscription: any = null;
    if (clientRef.current?.connected) {
      subscription = clientRef.current.subscribe(destination, (message) => {
        const payload = JSON.parse(message.body);
        callback(payload);
      });
    }

    return () => {
      subscriptionsRef.current[destination] = subscriptionsRef.current[destination].filter((cb) => cb !== callback);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ subscribe, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

