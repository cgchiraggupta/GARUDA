import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (message: any) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const roomsRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
      setConnectionStatus('connected');
        
        // Re-subscribe to topics and rooms
        subscriptionsRef.current.forEach(topic => {
          sendMessage({ type: 'subscribe', topic });
        });
        roomsRef.current.forEach(room => {
          sendMessage({ type: 'join_room', room });
        });
        
        toast.success('Connected to ITMS server');
      };

      // Local helpers to avoid hook dependency warnings
      const handleTopicUpdate = (topic: string, data: any) => {
        const event = new CustomEvent(`ws-${topic}`, { detail: data });
        window.dispatchEvent(event);
      };

      const handleRoomBroadcast = (room: string, data: any) => {
        const event = new CustomEvent(`ws-room-${room}`, { detail: data });
        window.dispatchEvent(event);
      };

      const handleSystemBroadcast = (data: any) => {
        console.log('System broadcast:', data);
      };

      const handleMessage = (message: any) => {
        switch (message.type) {
          case 'connection':
            console.log('WebSocket connection established:', message.clientId);
            break;
          case 'topic_update':
            handleTopicUpdate(message.topic, message.data);
            break;
          case 'broadcast':
            handleRoomBroadcast(message.room, message.data);
            break;
          case 'system_broadcast':
            handleSystemBroadcast(message.data);
            break;
          case 'error':
            console.error('WebSocket error:', message.message);
            toast.error(message.message);
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        toast.error('Connection error - attempting to reconnect...');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, []);



  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  const subscribe = (topic: string) => {
    subscriptionsRef.current.add(topic);
    sendMessage({ type: 'subscribe', topic });
  };

  const unsubscribe = (topic: string) => {
    subscriptionsRef.current.delete(topic);
    sendMessage({ type: 'unsubscribe', topic });
  };

  const joinRoom = (room: string) => {
    roomsRef.current.add(room);
    sendMessage({ type: 'join_room', room });
  };

  const leaveRoom = (room: string) => {
    roomsRef.current.delete(room);
    sendMessage({ type: 'leave_room', room });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    sendMessage,
    subscribe,
    unsubscribe,
    joinRoom,
    leaveRoom,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};