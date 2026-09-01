import { supabase } from '@/lib/supabase';

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  type: string;
  seen: boolean;
  timestamp: string;
};

/**
 * Fetch latest notifications from Supabase
 */
export async function fetchNotifications(limit: number = 20): Promise<NotificationRecord[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      title: d.title || 'Pemberitahuan Bakery',
      body: d.body || d.message || '',
      type: d.type || 'info',
      seen: Boolean(d.seen || d.read),
      timestamp: d.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("Could not fetch notifications from Supabase:", error);
    return [];
  }
}

/**
 * Mark a single notification as seen
 */
export async function markNotificationAsSeen(notificationId: string): Promise<void> {
  try {
    await supabase.from('notifications').update({ seen: true }).eq('id', notificationId);
  } catch (error) {
    console.error("Error marking notification as seen:", error);
  }
}

/**
 * Mark all unread notifications as seen
 */
export async function markAllNotificationsAsSeen(): Promise<void> {
  try {
    await supabase.from('notifications').update({ seen: true }).eq('seen', false);
  } catch (error) {
    console.error("Error marking all notifications as seen:", error);
  }
}

/**
 * Create a new notification in Supabase
 */
export async function createNotification(notif: {
  title: string;
  body: string;
  type?: 'info' | 'warning' | 'low_stock' | 'slow_moving' | 'idle_asset' | 'profit_anomaly';
}): Promise<void> {
  try {
    await supabase.from('notifications').insert([{
      title: notif.title,
      body: notif.body,
      type: notif.type || 'info',
      seen: false,
    }]);
  } catch (error) {
    console.warn("Could not save notification to Supabase:", error);
  }
}
