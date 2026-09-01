import { supabase } from '@/lib/supabase';
import { runGenerateDailyInsights } from '@/actions/ai';
import { subDays, format } from 'date-fns';

export type NotificationItem = {
  title: string;
  body: string;
  type: 'low_stock' | 'slow_moving' | 'idle_asset' | 'profit_anomaly';
};

export type DailyInsightsOutput = {
  lowStockItems: string[];
  topSellingItems: string[];
  slowMovingItems: string[];
  idleAssets: string[];
  profitAnomalies: string[];
  overallSummary: string;
  notifications: NotificationItem[];
};

export type DailyInsight = Omit<DailyInsightsOutput, 'notifications'> & {
  id: string;
  timestamp: string | Date;
};

// Main action to trigger daily bakery analysis
export async function generateAndStoreDailyAnalysis(): Promise<DailyInsight | null> {
  try {
    const fourteenDaysAgo = subDays(new Date(), 14).toISOString();
    const { data: orders } = await supabase.from('orders').select('*').gte('created_at', fourteenDaysAgo);
    const { data: inventory } = await supabase.from('inventory').select('*');
    const { data: assets } = await supabase.from('assets').select('*');

    const salesData: any[] = [];
    (orders || []).forEach((order: any) => {
      const items = order.items || [];
      items.forEach((item: any) => {
        const itemCost = item.costPrice || (item.price * 0.55);
        const profit = (item.price - itemCost) * item.quantity;
        salesData.push({
          name: item.name,
          quantity: item.quantity,
          profit,
          date: new Date(order.created_at || Date.now()).toISOString().split('T')[0],
        });
      });
    });

    const analysisResult = await runGenerateDailyInsights({
      salesData,
      inventoryData: inventory || [],
      assetData: assets || [],
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { notifications, ...insightData } = analysisResult;

    const fullInsightData: DailyInsight = {
      ...insightData,
      id: todayStr,
      timestamp: new Date().toISOString(),
    };

    try {
      await supabase.from('daily_insights').upsert({
        id: todayStr,
        ...insightData,
      });

      if (notifications && notifications.length > 0) {
        const notifInserts = notifications.map(notif => ({
          title: notif.title,
          body: notif.body,
          type: notif.type,
          seen: false,
        }));
        await supabase.from('notifications').insert(notifInserts);
      }
    } catch (e) {
      console.warn("Saved insight locally (Supabase offline)");
    }

    return fullInsightData;
  } catch (error) {
    console.error("Error in generateAndStoreDailyAnalysis: ", error);
    return null;
  }
}

export async function getLatestDailyAnalysis(): Promise<DailyInsight | null> {
  try {
    const { data, error } = await supabase
      .from('daily_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      return data[0] as DailyInsight;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export const getLatestDailyInsight = getLatestDailyAnalysis;
