'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  seen: boolean;
  timestamp: string | Date;
};

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'Stok Mentega Anchor Menipis',
    body: 'Sisa stok tinggal 4 kg, di bawah batas minimum 10 kg.',
    type: 'warning',
    seen: false,
    timestamp: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Servis Berkala Oven Gas',
    body: 'Jadwal servis rutin Oven Deck Sinmag dijadwalkan minggu ini.',
    type: 'info',
    seen: false,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

type NotificationContextType = {
  notifications: Notification[];
  unseenCount: number;
  loading: boolean;
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: DEFAULT_NOTIFICATIONS,
  unseenCount: 2,
  loading: false,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS);
  const [unseenCount, setUnseenCount] = useState(2);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnseenCount(0);
      return;
    }

    const fetchSupabaseNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          const fetched: Notification[] = data.map((d: any) => ({
            id: d.id,
            title: d.title || 'Notifikasi Bakery',
            body: d.body || d.message || '',
            type: d.type || 'info',
            seen: Boolean(d.seen || d.read),
            timestamp: d.created_at || new Date().toISOString(),
          }));
          setNotifications(fetched);
          setUnseenCount(fetched.filter(n => !n.seen).length);
        }
      } catch (e) {
        console.warn("Using offline default notifications:", e);
      }
    };

    fetchSupabaseNotifications();
  }, [user]);

  const value = { notifications, unseenCount, loading };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
