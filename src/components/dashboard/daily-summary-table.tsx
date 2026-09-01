'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getLatestDailySummaries, generateDailySummaryForDate, type DailySummary } from '@/actions/summaries';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ChevronDown, RefreshCw, AlertCircle, Package, Wrench, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { parseSafeDate } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

function DailySummaryRow({ summary }: { summary: DailySummary }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow onClick={() => setIsOpen(!isOpen)} className="cursor-pointer hover:bg-muted/50 transition-colors">
        <TableCell>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span>{format(parseSafeDate(summary.timestamp), 'EEEE, d MMM yyyy', { locale: idLocale })}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </TableCell>
        <TableCell className="text-right font-medium text-foreground">{formatCurrency(summary.totalRevenue)}</TableCell>
        <TableCell className="text-right text-muted-foreground">{summary.totalOrders} Pesanan</TableCell>
        <TableCell className="font-medium text-foreground">{summary.topItems[0]?.name || '-'}</TableCell>
        <TableCell className="text-right">
          {summary.lowStockCount > 0 ? (
            <Badge variant="destructive" className="text-[10px] font-medium">{summary.lowStockCount} Bahan</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Aman</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {summary.maintenanceAssetsCount > 0 ? (
            <Badge variant="secondary" className="text-[10px] font-medium">{summary.maintenanceAssetsCount} Alat</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Normal</span>
          )}
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-card p-4 rounded-lg border border-border">
              <div>
                <h4 className="font-medium text-xs text-foreground mb-1.5 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-muted-foreground"/> 5 Produk Terlaris
                </h4>
                <ul className="list-decimal list-inside text-xs text-muted-foreground space-y-0.5">
                  {summary.topItems.length > 0 ? summary.topItems.map(item => (
                    <li key={item.name}>{item.name} ({item.quantity} pcs)</li>
                  )) : <li>Tidak ada transaksi.</li>}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-xs text-foreground mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground"/> Stok Bahan Menipis
                </h4>
                <p className="text-xs text-muted-foreground">
                  {summary.lowStockItems.length > 0 ? summary.lowStockItems.join(', ') : 'Semua stok bahan baku mencukupi.'}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-xs text-foreground mb-1.5 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground"/> Peralatan Perlu Servis
                </h4>
                <p className="text-xs text-muted-foreground">
                  {summary.maintenanceAssets.length > 0 ? summary.maintenanceAssets.join(', ') : 'Semua peralatan beroperasi baik.'}
                </p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function DailySummaryTable() {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLatestDailySummaries(10);
      setSummaries(data);
    } catch (error) {
      toast({ title: 'Gagal', description: 'Gagal mengambil ringkasan harian.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleGenerateToday = async () => {
    setGenerating(true);
    try {
      await generateDailySummaryForDate(new Date());
      toast({ title: 'Berhasil', description: 'Ringkasan operasional hari ini berhasil dibuat.' });
      fetchSummaries();
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal membuat ringkasan harian.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Riwayat Ringkasan Harian</CardTitle>
          <CardDescription>Metrik operasional 10 hari terakhir</CardDescription>
        </div>
        <Button onClick={handleGenerateToday} disabled={generating || loading} size="sm" variant="outline" className="h-8 text-xs font-medium">
          {generating ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Rekap Hari Ini
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">Pesanan</TableHead>
                <TableHead>Menu Terlaris</TableHead>
                <TableHead className="text-right">Bahan Kritis</TableHead>
                <TableHead className="text-right">Alat Servis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : summaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-xs text-muted-foreground">
                    Belum ada ringkasan harian. Klik tombol di atas untuk membuat ringkasan hari ini.
                  </TableCell>
                </TableRow>
              ) : (
                summaries.map(summary => <DailySummaryRow key={summary.id} summary={summary} />)
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
