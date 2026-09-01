import { supabase } from '@/lib/supabase';

export async function markNotificationAsSeen(notificationId: string): Promise<void> {
  try {
    await supabase.from('notifications').update({ seen: true }).eq('id', notificationId);
  } catch (error) {
    console.error("Error marking notification as seen:", error);
  }
}

export async function markAllNotificationsAsSeen(): Promise<void> {
  try {
    await supabase.from('notifications').update({ seen: true }).eq('seen', false);
  } catch (error) {
    console.error("Error marking all notifications as seen:", error);
  }
}
