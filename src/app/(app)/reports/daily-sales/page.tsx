'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Calendar as CalendarIcon, Banknote, QrCode } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabase';
import { startOfDay, endOfDay, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { parseSafeDate } from '@/lib/utils';

type Sale = {
  id: string;
  time: string;
  item: string;
  amount: number;
  paymentMethod: 'cash' | 'qris' | string;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function DailySalesPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadLocalSales = (targetDate: Date) => {
    let orders: any[] = [];
    try {
      const saved = localStorage.getItem('rotikita_orders');
      orders = saved ? JSON.parse(saved) : [];
    } catch (e) {
      orders = [];
    }

    const start = startOfDay(targetDate).getTime();
    const end = endOfDay(targetDate).getTime();

    const filtered = (Array.isArray(orders) ? orders : []).filter(ord => {
      const d = parseSafeDate(ord.created_at || ord.timestamp);
      const t = d.getTime();
      return t >= start && t <= end;
    });

    const parsed: Sale[] = filtered.map(ord => {
      const d = parseSafeDate(ord.created_at || ord.timestamp);
      return {
        id: ord.id ? String(ord.id).slice(0, 8).toUpperCase() : 'TRX',
        time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        item: (ord.items || []).map((item: any) => `${item.name} (x${item.quantity})`).join(', ') || 'Item Penjualan',
        amount: Number(ord.gross_revenue || ord.total || 0),
        paymentMethod: ord.payment_method || 'Tunai',
      };
    });

    setSales(parsed);
  };

  useEffect(() => {
    setLoading(true);
    const fetchSupabaseDailySales = async () => {
      try {
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const fetchedSales: Sale[] = data.map((d: any) => ({
            id: String(d.id).slice(0, 8).toUpperCase(),
            time: parseSafeDate(d.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            item: (d.items || []).map((item: any) => `${item.name} (x${item.quantity})`).join(', ') || 'Item Penjualan',
            amount: Number(d.gross_revenue || d.total || 0),
            paymentMethod: d.payment_method || 'Tunai',
          }));
          setSales(fetchedSales);
        } else {
          loadLocalSales(date);
        }
      } catch (e) {
        loadLocalSales(date);
      } finally {
        setLoading(false);
      }
    };

    fetchSupabaseDailySales();
  }, [date]);

  const handleExport = async () => {
    if (sales.length === 0) {
      toast({ title: 'Data Kosong', description: 'Tidak ada transaksi pada tanggal yang dipilih.', variant: 'default' });
      return;
    }

    toast({ title: 'Mengekspor...', description: 'File Excel sedang dipersiapkan.' });
    
    const dataToExport = sales.map(sale => ({
      'ID Struk': sale.id,
      'Waktu Transaksi': sale.time,
      'Daftar Item': sale.item,
      'Metode Pembayaran': sale.paymentMethod === 'cash' || sale.paymentMethod === 'Tunai' ? 'Tunai' : 'QRIS',
      'Total Belanja (Rp)': sale.amount,
    }));

    const exportFileName = `Laporan_Penjualan_${format(parseSafeDate(date), 'yyyy-MM-dd')}.xlsx`;

    const xlsx = await import('xlsx');
    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Penjualan Harian");
    xlsx.writeFile(wb, exportFileName);
    toast({ title: 'Selesai', description: `File ${exportFileName} berhasil diunduh.` });
  };

  const totalSales = sales.reduce((acc, sale) => acc + sale.amount, 0);
  const totalCash = sales.filter(s => s.paymentMethod === 'cash' || s.paymentMethod === 'Tunai').reduce((acc, sale) => acc + sale.amount, 0);
  const totalQris = sales.filter(s => s.paymentMethod === 'qris' || s.paymentMethod === 'QRIS').reduce((acc, sale) => acc + sale.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Laporan Penjualan Harian</h1>
          <p className="text-xs text-muted-foreground">Rincian seluruh struk transaksi kasir per tanggal transaksi.</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold border-border">
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-primary" />
                {format(parseSafeDate(date), 'd MMMM yyyy', { locale: idLocale })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={(newDate) => newDate && setDate(newDate)} initialFocus />
            </PopoverContent>
          </Popover>
          <Button onClick={handleExport} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Ekspor Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Omzet Harian</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">{sales.length} transaksi selesai</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Penerimaan Tunai</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(totalCash)}</div>
            <p className="text-xs text-muted-foreground mt-1">Uang fisik di laci kasir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Penerimaan QRIS</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(totalQris)}</div>
            <p className="text-xs text-muted-foreground mt-1">Non-tunai via QRIS</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Transactions Table */}
      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-0">
          <ScrollArea className="h-96 w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold text-foreground h-8 w-24">Waktu</TableHead>
                  <TableHead className="text-xs font-bold text-foreground h-8">Item Roti / Kue</TableHead>
                  <TableHead className="text-xs font-bold text-foreground h-8 w-28">Metode</TableHead>
                  <TableHead className="text-xs font-bold text-foreground h-8 text-right w-36">Total Belanja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-xs">
                      Tidak ada transaksi pada tanggal ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{sale.time}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground">{sale.item}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          sale.paymentMethod === 'cash' || sale.paymentMethod === 'Tunai'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : 'bg-sky-50 text-sky-700 border border-sky-300'
                        }`}>
                          {sale.paymentMethod === 'cash' || sale.paymentMethod === 'Tunai' ? 'Tunai' : 'QRIS'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-right text-foreground whitespace-nowrap">
                        {formatCurrency(sale.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
