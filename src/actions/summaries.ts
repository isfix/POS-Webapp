import { supabase } from '@/lib/supabase';
import { format, startOfDay, endOfDay } from 'date-fns';

export type DailySummary = {
  id: string; // YYYY-MM-DD
  timestamp: string | Date;
  totalRevenue: number;
  totalOrders: number;
  topItems: { name: string; quantity: number }[];
  lowStockCount: number;
  maintenanceAssetsCount: number;
  lowStockItems: string[];
  maintenanceAssets: string[];
};

export async function generateDailySummaryForDate(date: Date): Promise<DailySummary> {
  const start = startOfDay(date).toISOString();
  const end = endOfDay(date).toISOString();
  const dateId = format(date, 'yyyy-MM-dd');

  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end);

    let totalRevenue = 0;
    const itemCounts: { [key: string]: number } = {};

    (orders || []).forEach((order: any) => {
      totalRevenue += Number(order.gross_revenue || order.total || 0);
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
        });
      }
    });

    const topItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    const { data: inventory } = await supabase.from('inventory').select('*');
    const lowStockItems: string[] = [];
    (inventory || []).forEach((item: any) => {
      if (item.quantity <= (item.min_threshold || item.minThreshold || 0)) {
        lowStockItems.push(item.name);
      }
    });

    const { data: assets } = await supabase.from('assets').select('*').eq('status', 'Dalam Perbaikan');
    const maintenanceAssets = (assets || []).map((a: any) => a.name);

    const summaryData: DailySummary = {
      id: dateId,
      timestamp: date.toISOString(),
      totalRevenue,
      totalOrders: (orders || []).length,
      topItems,
      lowStockCount: lowStockItems.length,
      maintenanceAssetsCount: maintenanceAssets.length,
      lowStockItems,
      maintenanceAssets,
    };

    return summaryData;
  } catch (error) {
    console.warn("Failed to generate daily summary:", error);
    return {
      id: dateId,
      timestamp: date.toISOString(),
      totalRevenue: 0,
      totalOrders: 0,
      topItems: [],
      lowStockCount: 0,
      maintenanceAssetsCount: 0,
      lowStockItems: [],
      maintenanceAssets: [],
    };
  }
}

export async function getLatestDailySummaries(count: number = 10): Promise<DailySummary[]> {
  try {
    const { data } = await supabase
      .from('daily_summaries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(count);

    if (data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        timestamp: d.created_at,
        totalRevenue: d.total_revenue,
        totalOrders: d.total_orders,
        topItems: d.top_items || [],
        lowStockCount: d.low_stock_count || 0,
        maintenanceAssetsCount: d.maintenance_assets_count || 0,
        lowStockItems: d.low_stock_items || [],
        maintenanceAssets: d.maintenance_assets || [],
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
}
