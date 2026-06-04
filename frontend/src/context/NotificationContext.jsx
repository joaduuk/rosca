import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import API from '../services/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await API.get('/notifications?limit=30');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (e) {
      console.error('[Notifications] fetch failed:', e);
    }
  }, [user]);

  const connectWebSocket = useCallback(() => {
    if (!user || !token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `wss://roscaapp.com/ws/notifications/${user.id}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      // Ping every 30s to keep alive
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        else clearInterval(ping);
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return;
        // Prepend new notification
        setNotifications(prev => [data, ...prev]);
        setUnreadCount(prev => prev + 1);
      } catch (e) {}
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected — reconnecting in 5s');
      reconnectTimer.current = setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = () => ws.close();
  }, [user, token]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      connectWebSocket();
    }
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  }, [user]);

  const markRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const clearAll = async () => {
    try {
      await API.delete('/notifications/clear');
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {}
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, clearAll, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
