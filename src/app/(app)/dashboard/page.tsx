'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { subDays, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { parseSafeDate } from '@/lib/utils';

import { StatsCards } from '@/components/dashboard/stats-cards';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { ProfitChart } from '@/components/dashboard/profit-chart';
import { TopItemsCard } from '@/components/dashboard/top-items-card';
import { DailySummaryTable } from '@/components/dashboard/daily-summary-table';
import { DailyInsights } from '@/components/dashboard/daily-insights';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export type DashboardData = {
  stats: {
    weeklyRevenue: number;
    weeklyOrders: number;
    weeklyProfit: number;
    bestProfitDay: { day: string; profit: number };
  };
  salesChartData: { date: string; sales: number }[];
  profitChartData: { date: string; profit: number }[];
  topItems: { name: string; quantity: number; revenue: number; profit: number }[];
};

export type Transaction = {
  id: string;
  itemsSummary: string;
  date: string;
  amount: string;
  status: string;
  paymentMethod?: string;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateStatsFromOrders = (orders: any[]) => {
    const today = new Date();
    let weeklyRevenue = 0;
    let weeklyProfit = 0;
    const weeklyOrdersCount = Array.isArray(orders) ? orders.length : 0;

    const dailySales: { [key: string]: number } = {};
    const dailyProfits: { [key: string]: number } = {};
    const itemCounts: { [key: string]: { quantity: number; revenue: number; profit: number } } = {};
    
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(today, i), 'EEE', { locale: idLocale });
      dailySales[date] = 0;
      dailyProfits[date] = 0;
    }

    if (Array.isArray(orders)) {
      orders.forEach(order => {
        const dateObj = parseSafeDate(order.created_at || order.timestamp);
        const dayOfWeek = format(dateObj, 'EEE', { locale: idLocale });
        
        const rev = Number(order.gross_revenue || order.grossRevenue || order.total || 0);
        const prof = Number(order.total_profit || order.totalProfit || (rev * 0.45));
        
        weeklyRevenue += rev;
        weeklyProfit += prof;

        if (dailySales[dayOfWeek] !== undefined) {
          dailySales[dayOfWeek] += rev;
          dailyProfits[dayOfWeek] += prof;
        }

        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (!itemCounts[item.name]) {
              itemCounts[item.name] = { quantity: 0, revenue: 0, profit: 0 };
            }
            const itemRev = Number(item.price || 0) * Number(item.quantity || 1);
            const itemCost = Number(item.costPrice || (item.price * 0.55)) * Number(item.quantity || 1);
            itemCounts[item.name].quantity += Number(item.quantity || 1);
            itemCounts[item.name].revenue += itemRev;
            itemCounts[item.name].profit += (itemRev - itemCost);
          });
        }
      });
    }

    const salesChartData = Object.keys(dailySales).map(date => ({
      date,
      sales: dailySales[date] || 0,
    }));

    const profitChartData = Object.keys(dailyProfits).map(date => ({
      date,
      profit: dailyProfits[date] || 0,
    }));

    const topItems = Object.keys(itemCounts)
      .map(name => ({
        name,
        quantity: itemCounts[name].quantity,
        revenue: itemCounts[name].revenue,
        profit: itemCounts[name].profit,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    let bestProfitDay = { day: 'Sabtu', profit: 0 };
    Object.keys(dailyProfits).forEach(day => {
      if (dailyProfits[day] > bestProfitDay.profit) {
        bestProfitDay = { day, profit: dailyProfits[day] };
      }
    });

    const parsedTransactions: Transaction[] = (Array.isArray(orders) ? orders.slice(0, 5) : []).map((order) => {
      const dateObj = parseSafeDate(order.created_at || order.timestamp);
      const itemsList = order.items && Array.isArray(order.items) ? order.items.map((i: any) => `${i.name} (x${i.quantity})`).join(', ') : 'Pesanan Kasir';
      return {
        id: order.id ? String(order.id).slice(0, 8).toUpperCase() : 'TRX',
        itemsSummary: itemsList || 'Item Penjualan',
        date: format(dateObj, 'd MMM, HH:mm', { locale: idLocale }),
        amount: formatCurrency(Number(order.gross_revenue || order.grossRevenue || order.total || 0)),
        status: 'Selesai',
        paymentMethod: order.payment_method || order.paymentMethod || 'Tunai',
      };
    });

    setDashboardData({
      stats: {
        weeklyRevenue,
        weeklyOrders: weeklyOrdersCount,
        weeklyProfit,
        bestProfitDay,
      },
      salesChartData,
      profitChartData,
      topItems,
    });
    setTransactions(parsedTransactions);
    setLoading(false);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          calculateStatsFromOrders(data);
          localStorage.setItem('pos_orders', JSON.stringify(data));
        } else {
          const savedOrders = localStorage.getItem('pos_orders');
          if (savedOrders) {
            calculateStatsFromOrders(JSON.parse(savedOrders));
          } else {
            calculateStatsFromOrders([]);
          }
        }
      } catch (e) {
        const savedOrders = localStorage.getItem('pos_orders');
        if (savedOrders) {
          calculateStatsFromOrders(JSON.parse(savedOrders));
        } else {
          calculateStatsFromOrders([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Dasbor Operasional</h2>
        <p className="text-sm text-muted-foreground">
          Ringkasan performa penjualan, laba, dan aktivitas kasir 7 hari terakhir.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <StatsCards stats={dashboardData?.stats || { weeklyRevenue: 0, weeklyOrders: 0, weeklyProfit: 0, bestProfitDay: { day: 'Sabtu', profit: 0 } }} />

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <SalesChart chartData={dashboardData?.salesChartData || []} />
        <ProfitChart chartData={dashboardData?.profitChartData || []} />
      </div>

      {/* Top Products & Daily Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-3">
          <TopItemsCard items={dashboardData?.topItems || []} />
        </div>
        <div className="lg:col-span-4">
          <DailySummaryTable />
        </div>
      </div>

      {/* Recent Transactions & AI Insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Transaksi Kasir Terakhir</CardTitle>
              <CardDescription>5 transaksi penjualan paling baru yang selesai dicatat</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24">ID Struk</TableHead>
                    <TableHead>Item Produk</TableHead>
                    <TableHead className="w-24">Waktu</TableHead>
                    <TableHead className="w-20">Metode</TableHead>
                    <TableHead className="text-right w-28">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs">
                        Belum ada transaksi tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((trx) => (
                      <TableRow key={trx.id}>
                        <TableCell className="font-mono text-xs font-medium text-foreground">{trx.id}</TableCell>
                        <TableCell className="font-medium text-foreground text-xs truncate max-w-[200px]">{trx.itemsSummary}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{trx.date}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            {trx.paymentMethod === 'cash' || trx.paymentMethod === 'Tunai' ? 'Tunai' : 'QRIS'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right text-foreground whitespace-nowrap">{trx.amount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3">
          <DailyInsights />
        </div>
      </div>
    </div>
  );
}
