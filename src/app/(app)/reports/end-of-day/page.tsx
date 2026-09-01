'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Banknote, QrCode, ShoppingBag, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { startOfDay, endOfDay, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import * as xlsx from 'xlsx';

type DailySummary = {
  date: string;
  totalSales: number;
  totalOrders: number;
  totalCashSales: number;
  totalQrisSales: number;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function EndOfDayReportPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const calculateDailySummary = (orders: any[]) => {
    let totalSales = 0;
    let totalCashSales = 0;
    let totalQrisSales = 0;

    orders.forEach((ord) => {
      const amount = Number(ord.gross_revenue || ord.total || 0);
      totalSales += amount;
      if (ord.payment_method === 'cash' || ord.payment_method === 'Tunai') {
        totalCashSales += amount;
      } else {
        totalQrisSales += amount;
      }
    });

    const totalOrders = orders.length;

    setSummary({
      date: format(new Date(), 'd MMMM yyyy', { locale: idLocale }),
      totalSales,
      totalOrders,
      totalCashSales,
      totalQrisSales,
    });
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    const fetchSupabaseEndOfDay = async () => {
      try {
        const today = new Date();
        const start = startOfDay(today).toISOString();
        const end = endOfDay(today).toISOString();

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end);

        if (!error && data && data.length > 0) {
          calculateDailySummary(data);
        } else {
          const saved = localStorage.getItem('rotikita_orders');
          const localOrders = saved ? JSON.parse(saved) : [];
          calculateDailySummary(localOrders);
        }
      } catch (e) {
        const saved = localStorage.getItem('rotikita_orders');
        const localOrders = saved ? JSON.parse(saved) : [];
        calculateDailySummary(localOrders);
      } finally {
        setLoading(false);
      }
    };

    fetchSupabaseEndOfDay();
  }, []);

  const handleExport = () => {
    if (!summary) return;

    toast({ title: 'Mengekspor...', description: 'Laporan tutup kasir sedang disiapkan.' });

    const dataToExport = [
      { 'Indikator': 'Tanggal Laporan', 'Nilai': summary.date },
      { 'Indikator': 'Total Omzet Penjualan (Rp)', 'Nilai': summary.totalSales },
      { 'Indikator': 'Jumlah Transaksi (Struk)', 'Nilai': summary.totalOrders },
      { 'Indikator': 'Total Penerimaan Tunai (Rp)', 'Nilai': summary.totalCashSales },
      { 'Indikator': 'Total Penerimaan QRIS (Rp)', 'Nilai': summary.totalQrisSales },
    ];

    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Rekap Tutup Kasir");
    const exportFileName = `Rekap_Tutup_Kasir_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    xlsx.writeFile(wb, exportFileName);
    toast({ title: 'Selesai', description: `File ${exportFileName} berhasil diunduh.` });
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Rekap Tutup Kasir Harian (End-of-Day)</h1>
          <p className="text-xs text-muted-foreground">
            Laporan rekonsiliasi kas laci kasir dan pembayaran digital QRIS pada penutupan hari.
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Penjualan Hari Ini</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summary.totalSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Omzet kotor seluruh metode</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Kas Tunai di Laci</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summary.totalCashSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Uang fisik di kasir</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Penerimaan QRIS</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summary.totalQrisSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Non-tunai via merchant</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Struk Pesanan</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{summary.totalOrders} Struk</div>
              <p className="text-xs text-muted-foreground mt-1">Transaksi selesai hari ini</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
