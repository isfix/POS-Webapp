'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onSnapshot, collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

type Notification = {
    id: string;
    title: string;
    body: string;
    type: string;
    seen: boolean;
    timestamp: Timestamp;
};

type NotificationContextType = {
  notifications: Notification[];
  unseenCount: number;
  loading: boolean;
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unseenCount: 0,
  loading: true,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setNotifications([]);
        setUnseenCount(0);
        setLoading(false);
        return;
    }
    
    setLoading(true);
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(20));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedNotifications: Notification[] = [];
        let count = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.seen) {
                count++;
            }
            fetchedNotifications.push({ id: doc.id, ...data } as Notification);
        });
        setNotifications(fetchedNotifications);
        setUnseenCount(count);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching notifications:", error);
        setLoading(false);
    });

    return () => unsubscribe();
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
