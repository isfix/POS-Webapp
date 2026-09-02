'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Banknote, QrCode, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { parseSafeDate } from '@/lib/utils';

const MonthlySalesChart = dynamic(
  () => import('@/components/reports/monthly-sales-chart').then((mod) => mod.MonthlySalesChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[240px] w-full rounded-xl" />,
  }
);

type MonthlyData = {
  date: string;
  sales: number;
};

type MonthlySummary = {
  totalSales: number;
  totalCashSales: number;
  totalQrisSales: number;
  busiestDay: { day: string; sales: number };
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function EndOfMonthReportPage() {
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const calculateMonthlyData = (orders: any[]) => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dailySales: Record<string, number> = {};
    daysInMonth.forEach(day => {
      dailySales[format(day, 'dd')] = 0;
    });

    let totalSales = 0;
    let totalCashSales = 0;
    let totalQrisSales = 0;

    (Array.isArray(orders) ? orders : []).forEach((ord) => {
      const dateObj = parseSafeDate(ord.created_at || ord.timestamp);
      const day = format(dateObj, 'dd');
      const amount = Number(ord.gross_revenue || ord.total || 0);
      
      totalSales += amount;
      if (dailySales[day] !== undefined) {
        dailySales[day] += amount;
      }

      if (ord.payment_method === 'cash' || ord.payment_method === 'Tunai') {
        totalCashSales += amount;
      } else {
        totalQrisSales += amount;
      }
    });

    const formattedChartData = Object.entries(dailySales).map(([date, sales]) => ({
      date: `Tgl ${date}`,
      sales: sales || 0,
    }));

    const calculatedTotal = formattedChartData.reduce((sum, item) => sum + item.sales, 0);

    const busiestDay = formattedChartData.reduce((max, entry) => {
      return entry.sales > max.sales ? { day: entry.date, sales: entry.sales } : max;
    }, { day: '-', sales: 0 });

    setChartData(formattedChartData);
    setSummary({
      totalSales: calculatedTotal,
      totalCashSales,
      totalQrisSales,
      busiestDay,
    });
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    const fetchSupabaseMonthly = async () => {
      try {
        const today = new Date();
        const monthStart = startOfMonth(today).toISOString();
        const monthEnd = endOfMonth(today).toISOString();

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd);

        if (!error && data && data.length > 0) {
          calculateMonthlyData(data);
        } else {
          const saved = localStorage.getItem('rotikita_orders');
          const localOrders = saved ? JSON.parse(saved) : [];
          calculateMonthlyData(localOrders);
        }
      } catch {
        const saved = localStorage.getItem('rotikita_orders');
        const localOrders = saved ? JSON.parse(saved) : [];
        calculateMonthlyData(localOrders);
      } finally {
        setLoading(false);
      }
    };

    fetchSupabaseMonthly();
  }, []);

  const handleExport = async () => {
    if (!summary || chartData.length === 0) return;

    toast({ title: 'Mengekspor...', description: 'Laporan bulanan sedang disiapkan.' });

    const dataToExport = chartData.map(item => ({
      'Tanggal': item.date,
      'Omzet Penjualan (Rp)': item.sales,
    }));

    const xlsx = await import('xlsx');
    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Rekap Bulanan");
    const exportFileName = `Rekap_Bulanan_${format(new Date(), 'yyyy-MM')}.xlsx`;
    xlsx.writeFile(wb, exportFileName);
    toast({ title: 'Selesai', description: `File ${exportFileName} berhasil diunduh.` });
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Rekapitulasi Penjualan Bulanan</h1>
          <p className="text-xs text-muted-foreground">
            Performa total omzet, perbandingan metode bayar, dan tren harian bulan {format(new Date(), 'MMMM yyyy', { locale: idLocale })}.
          </p>
        </div>
        <Button onClick={handleExport} disabled={!summary} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-sm">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Ekspor Excel
        </Button>
      </div>

      {loading || !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-border p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-36" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Omzet Bulan Ini</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summary.totalSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Akumulasi penjualan kotor</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Penerimaan Tunai</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summary.totalCashSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Kas tunai langsung</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Penerimaan QRIS</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summary.totalQrisSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Non-tunai via QRIS</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hari Penjualan Tertinggi</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground truncate">{summary.busiestDay.day}</div>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(summary.busiestDay.sales)} tercapai</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Trend Chart */}
      <MonthlySalesChart chartData={chartData} />
    </div>
  );
}
