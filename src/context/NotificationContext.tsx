'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchNotifications, markNotificationAsSeen, markAllNotificationsAsSeen, type NotificationRecord } from '@/actions/notifications';
import { useAuth } from './AuthContext';

export type Notification = NotificationRecord;

type NotificationContextType = {
  notifications: Notification[];
  unseenCount: number;
  loading: boolean;
  markAsSeen: (id: string) => Promise<void>;
  markAllAsSeen: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unseenCount: 0,
  loading: false,
  markAsSeen: async () => {},
  markAllAsSeen: async () => {},
  refreshNotifications: async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const fetched = await fetchNotifications(20);
      if (fetched && fetched.length > 0) {
        setNotifications(fetched);
        setUnseenCount(fetched.filter(n => !n.seen).length);
      }
    } catch (e) {
      console.warn("Using offline default notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnseenCount(0);
      return;
    }

    loadNotifications();
  }, [user]);

  const markAsSeen = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, seen: true } : n));
    setUnseenCount(prev => Math.max(0, prev - 1));
    await markNotificationAsSeen(id);
  };

  const markAllAsSeen = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, seen: true })));
    setUnseenCount(0);
    await markAllNotificationsAsSeen();
  };

  const value = {
    notifications,
    unseenCount,
    loading,
    markAsSeen,
    markAllAsSeen,
    refreshNotifications: loadNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
