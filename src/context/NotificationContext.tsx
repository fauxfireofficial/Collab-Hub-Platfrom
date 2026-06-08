import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Bell, MessageCircle, UserPlus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from './AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  type: 'message' | 'connection_request' | 'connection_accepted' | 'investment_interest';
  content: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refetch: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ── Fetch all notifications from backend ────────────────────────────────────
  const refetch = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ── Initial load + socket connect when user logs in ─────────────────────────
  useEffect(() => {
    if (!user) {
      // Clean up if user logs out
      setNotifications([]);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // 1. Load existing notifications
    refetch();

    // 2. Connect socket
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Register user to their private room
      socket.emit('register-user', user.id);
    });

    // 3. Listen for incoming real-time notifications
    socket.on('new-notification', (notification: AppNotification) => {
      setNotifications(prev => [notification, ...prev]);

      // Show a toast with icon based on type
      const icon = notification.type === 'message'
        ? '💬'
        : notification.type === 'connection_accepted'
          ? '🤝'
          : '🔔';

      toast(notification.content, {
        icon,
        duration: 5000,
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f8fafc',
          fontSize: '14px',
          maxWidth: '380px',
        },
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, refetch]);

  // ── Mark single notification as read ────────────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // ── Mark all as read ────────────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  // ── Delete single notification ───────────────────────────────────────────────
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, []);

  // ── Clear all ───────────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refetch,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useNotifications = (): NotificationContextType => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
