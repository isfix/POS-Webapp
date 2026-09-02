'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  openCashReconciliation,
  recordCountedCash,
  getRecentReconciliations,
  computeExpectedCash,
  type CashReconciliation,
} from '@/actions/reconciliation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  QrCode,
  Coins,
  History,
  Clock,
  ArrowRight,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { parseSafeDate } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function DailyClosePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reconciliations, setReconciliations] = useState<CashReconciliation[]>([]);
  const [todayReconciliation, setTodayReconciliation] = useState<CashReconciliation | null>(null);

  // Form states
  const [openingFloatInput, setOpeningFloatInput] = useState<number>(0);
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [liveSales, setLiveSales] = useState<{ cashSales: number; qrisSales: number; totalOrders: number }>({
    cashSales: 0,
    qrisSales: 0,
    totalOrders: 0,
  });

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayFormatted = useMemo(() => format(new Date(), 'EEEE, dd MMMM yyyy', { locale: idLocale }), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sales = await computeExpectedCash(new Date());
      setLiveSales(sales);

      const recent = await getRecentReconciliations(30);
      setReconciliations(recent);

      const current = recent.find((r) => r.date === todayStr) || null;
      setTodayReconciliation(current);

      if (current) {
        setOpeningFloatInput(current.opening_float);
        if (current.counted_cash !== null && current.counted_cash !== undefined) {
          setCountedCashInput(current.counted_cash.toString());
        }
        if (current.notes) {
          setNotesInput(current.notes);
        }
      }
    } catch (err) {
      console.error('Failed to load reconciliation data:', err);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live variance calculation
  const effectiveFloat = todayReconciliation ? todayReconciliation.opening_float : openingFloatInput;
  const effectiveCashSales = todayReconciliation ? todayReconciliation.cash_sales : liveSales.cashSales;
  const expectedTotalCash = effectiveFloat + effectiveCashSales;

  const parsedCountedCash = countedCashInput !== '' ? Number(countedCashInput) : null;
  const liveVariance = parsedCountedCash !== null ? parsedCountedCash - expectedTotalCash : null;

  const handleOpenShift = async () => {
    setSubmitting(true);
    try {
      const staffName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Staf Kasir';
      const result = await openCashReconciliation(new Date(), staffName, openingFloatInput);
      setTodayReconciliation(result);
      toast({
        title: 'Shift Kasir Dibuka',
        description: `Modal kasir awal Rp ${openingFloatInput.toLocaleString('id-ID')} berhasil dicatat.`,
      });
      await loadData();
    } catch (err) {
      toast({ title: 'Gagal Membuka Shift', description: 'Terjadi kesalahan sistem.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (parsedCountedCash === null || isNaN(parsedCountedCash)) {
      toast({ title: 'Uang Fisik Belum Diisi', description: 'Masukkan jumlah uang tunai yang dihitung di laci.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const staffName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Staf Kasir';
      const result = await recordCountedCash(
        new Date(),
        parsedCountedCash,
        staffName,
        effectiveFloat,
        notesInput
      );
      setTodayReconciliation(result);

      if (result.status === 'closed') {
        toast({
          title: 'Tutup Kasir Sempurna',
          description: 'Uang fisik di laci cocok 100% dengan catatan sistem (Selisih: Rp 0).',
        });
      } else {
        toast({
          title: 'Tutup Kasir Disimpan (Ada Selisih)',
          description: `Tercatat selisih sebesar Rp ${(result.variance || 0).toLocaleString('id-ID')}.`,
        });
      }

      await loadData();
    } catch (err) {
      toast({ title: 'Gagal Menutup Shift', description: 'Terjadi kesalahan saat menyimpan data.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Rekonsiliasi & Tutup Kasir Harian
          </h1>
          <p className="text-xs text-muted-foreground">
            Hitung fisik uang tunai di laci kasir pada akhir shift dan pastikan kesesuaian dengan total penjualan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold py-1 px-2.5 gap-1.5 bg-card">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {todayFormatted}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Main Reconciliation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Shift Status & Cash Breakdown */}
        <Card className="lg:col-span-1 border border-border shadow-xs bg-card flex flex-col justify-between">
          <div>
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" />
                  Status Shift Kasir Hari Ini
                </CardTitle>
                {todayReconciliation ? (
                  todayReconciliation.status === 'closed' ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Shift Selesai (Pas)</Badge>
                  ) : todayReconciliation.status === 'discrepancy' ? (
                    <Badge variant="destructive" className="text-[10px] font-bold">Ada Selisih</Badge>
                  ) : (
                    <Badge className="bg-amber-600 text-white text-[10px] font-bold">Shift Terbuka</Badge>
                  )
                ) : (
                  <Badge variant="secondary" className="text-[10px] font-medium">Belum Dibuka</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 text-xs">
              {/* Modal Awal */}
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-amber-600" />
                  Modal Kasir Awal (Float):
                </span>
                <span className="font-bold text-foreground">
                  {formatCurrency(effectiveFloat)}
                </span>
              </div>

              {/* Omzet Penjualan Tunai */}
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  Penjualan Tunai (Cash):
                </span>
                <span className="font-bold text-foreground">
                  {formatCurrency(effectiveCashSales)}
                </span>
              </div>

              {/* Omzet QRIS */}
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-blue-600" />
                  Penjualan QRIS (Non-Tunai):
                </span>
                <span className="font-semibold text-muted-foreground">
                  {formatCurrency(todayReconciliation ? todayReconciliation.qris_sales : liveSales.qrisSales)}
                </span>
              </div>

              {/* Total Fisik Seharusnya */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="text-[11px] font-semibold text-primary">Total Uang Seharusnya di Laci:</div>
                <div className="text-lg font-black text-foreground">
                  {formatCurrency(expectedTotalCash)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  (Modal Awal + Omzet Tunai)
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-4 pt-0 text-[11px] text-muted-foreground">
            {todayReconciliation?.opened_at && (
              <p>Dibuka oleh: <strong>{todayReconciliation.opened_by}</strong> pada {format(parseSafeDate(todayReconciliation.opened_at), 'HH:mm')}</p>
            )}
            {todayReconciliation?.closed_at && (
              <p>Ditutup oleh: <strong>{todayReconciliation.closed_by}</strong> pada {format(parseSafeDate(todayReconciliation.closed_at), 'HH:mm')}</p>
            )}
          </div>
        </Card>

        {/* Right Column: Interactive Cash Count Form */}
        <Card className="lg:col-span-2 border border-border shadow-xs bg-card">
          <CardHeader className="p-4 pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Perhitungan Fisik Uang Tunai (Cash Count)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Hitung uang kertas dan koin di laci kasir secara teliti lalu masukkan nominalnya di bawah ini.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {!todayReconciliation ? (
              /* State: Shift Not Opened Yet */
              <div className="p-5 text-center rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                <Unlock className="h-8 w-8 text-amber-600 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Shift Kasir Belum Dibuka Hari Ini</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Buka shift kasir di awal hari kerja dengan memasukkan uang modal awal (uang kembalian) di laci kasir.
                  </p>
                </div>
                <div className="max-w-xs mx-auto space-y-2 pt-2">
                  <Label htmlFor="openingFloat" className="text-xs font-semibold text-left block">
                    Modal Kasir Awal (Rp):
                  </Label>
                  <Input
                    id="openingFloat"
                    data-testid="opening-float-input"
                    type="number"
                    value={openingFloatInput}
                    onChange={(e) => setOpeningFloatInput(Number(e.target.value) || 0)}
                    placeholder="Contoh: 200000"
                    className="text-xs h-9"
                  />
                  <Button
                    data-testid="open-shift-btn"
                    onClick={handleOpenShift}
                    disabled={submitting}
                    className="w-full text-xs font-bold gap-1.5 mt-2"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    Buka Shift Kasir Sekarang
                  </Button>
                </div>
              </div>
            ) : (
              /* State: Shift Opened, Counting / Closing available */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="countedCash" className="text-xs font-bold text-foreground">
                      Uang Fisik Dihitung di Laci (Rp) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="countedCash"
                      data-testid="counted-cash-input"
                      type="number"
                      placeholder="Masukkan total uang fisik di laci..."
                      value={countedCashInput}
                      onChange={(e) => setCountedCashInput(e.target.value)}
                      className="text-sm font-bold h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs font-semibold text-foreground">
                      Catatan / Keterangan (Opsional)
                    </Label>
                    <Input
                      id="notes"
                      data-testid="recon-notes-input"
                      placeholder="Contoh: Selisih Rp 500 karena pembulatan..."
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      className="text-xs h-10"
                    />
                  </div>
                </div>

                {/* Live Variance Status Banner */}
                {liveVariance !== null && (
                  <div
                    data-testid="variance-banner"
                    className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                      liveVariance === 0
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : liveVariance > 0
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-rose-50 text-rose-900 border-rose-300'
                    }`}
                  >
                    {liveVariance === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-bold">
                        {liveVariance === 0
                          ? 'Uang Fisik Sempurna / Pas (Selisih: Rp 0)'
                          : liveVariance > 0
                          ? `Uang Fisik Lebih: +${formatCurrency(liveVariance)}`
                          : `Uang Fisik Kurang: -${formatCurrency(Math.abs(liveVariance))}`}
                      </div>
                      <p className="text-[11px] opacity-90">
                        {liveVariance === 0
                          ? 'Jumlah uang fisik di laci kasir tepat sama dengan total modal awal dan penjualan tunai.'
                          : liveVariance > 0
                          ? `Terdapat kelebihan uang tunai sebesar ${formatCurrency(liveVariance)} dibandingkan catatan sistem.`
                          : `Terdapat kekurangan uang tunai sebesar ${formatCurrency(Math.abs(liveVariance))} dibandingkan catatan sistem.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
                  <div className="text-[11px] text-muted-foreground">
                    Pastikan seluruh kasir telah menyelesaikan transaksi sebelum menutup shift.
                  </div>
                  <Button
                    data-testid="close-shift-btn"
                    onClick={handleCloseShift}
                    disabled={submitting || countedCashInput === ''}
                    className="w-full sm:w-auto text-xs font-bold gap-1.5 shadow-xs"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    {todayReconciliation.status === 'closed' ? 'Perbarui Data Tutup Kasir' : 'Tutup Shift & Simpan Rekonsiliasi'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="border border-border shadow-xs bg-card">
        <CardHeader className="p-4 pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Riwayat Rekonsiliasi Kasir (30 Hari Terakhir)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Audit harian kepatuhan kasir dan catatan selisih kas fisik
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="[&_th]:py-2.5 [&_th]:text-xs">
                    <TableHead className="w-32">Tanggal</TableHead>
                    <TableHead className="text-center w-28">Status</TableHead>
                    <TableHead className="text-right w-28">Modal Awal</TableHead>
                    <TableHead className="text-right w-28">Omzet Tunai</TableHead>
                    <TableHead className="text-right w-32">Fisik Seharusnya</TableHead>
                    <TableHead className="text-right w-32">Fisik Dihitung</TableHead>
                    <TableHead className="text-right w-28">Selisih</TableHead>
                    <TableHead className="min-w-[150px]">Catatan / Kasir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      </TableRow>
                    ))
                  ) : reconciliations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24 text-xs text-muted-foreground">
                        Belum ada catatan rekonsiliasi kasir tersimpan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reconciliations.map((item) => {
                      const hasVariance = item.variance !== null && item.variance !== 0;
                      return (
                        <TableRow key={item.id} className="text-xs hover:bg-muted/40 transition-colors [&_td]:py-2.5">
                          <TableCell className="font-semibold text-foreground whitespace-nowrap">
                            {format(parseSafeDate(item.date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                item.status === 'closed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : item.status === 'discrepancy'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              {item.status === 'closed' ? 'Pas (0)' : item.status === 'discrepancy' ? 'Selisih' : 'Terbuka'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                            {formatCurrency(item.opening_float)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground whitespace-nowrap">
                            {formatCurrency(item.cash_sales)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground whitespace-nowrap">
                            {formatCurrency(item.expected_cash)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground whitespace-nowrap">
                            {item.counted_cash != null ? formatCurrency(item.counted_cash) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-black whitespace-nowrap ${
                            hasVariance ? (item.variance! > 0 ? 'text-amber-700' : 'text-destructive') : 'text-emerald-700'
                          }`}>
                            {item.variance != null ? (item.variance === 0 ? 'Rp 0' : formatCurrency(item.variance)) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate" title={item.notes || ''}>
                            {item.notes || (item.closed_by ? `Ditutup oleh ${item.closed_by}` : '-')}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
