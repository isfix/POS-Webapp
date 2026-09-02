'use client';

import { useState, useMemo } from 'react';
import { type OrderData, printReceipt, downloadReceiptHTML } from '@/lib/print';
import { Receipt } from '@/components/pos/receipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Printer, Download, Eye, Search, ReceiptText, Banknote, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { parseSafeDate } from '@/lib/utils';

interface ReceiptHistoryProps {
  orders: OrderData[];
  loading?: boolean;
  onRefresh?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function ReceiptHistory({ orders, loading = false, onRefresh }: ReceiptHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase();
      const idMatch = (order.id || '').toLowerCase().includes(q);
      const customerMatch = (order.customer_name || '').toLowerCase().includes(q);
      const paymentMatch = (order.payment_method || '').toLowerCase().includes(q);
      const itemsMatch = (order.items || []).some((i) => i.name.toLowerCase().includes(q));
      return idMatch || customerMatch || paymentMatch || itemsMatch;
    });
  }, [orders, searchQuery]);

  const handlePrint = async (order: OrderData) => {
    toast({ title: 'Mencetak Struk...', description: `Mengirim struk ${order.id} ke antrean cetak.` });
    const success = await printReceipt(order);
    if (success) {
      toast({ title: 'Cetak Selesai', description: 'Struk berhasil dikirim ke printer.' });
    }
  };

  const handleDownload = (order: OrderData) => {
    downloadReceiptHTML(order);
    toast({ title: 'Tersimpan', description: `Struk ${order.id} berhasil diunduh sebagai berkas HTML.` });
  };

  const handlePreview = (order: OrderData) => {
    setSelectedOrder(order);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="border border-border shadow-xs bg-card">
        <CardHeader className="p-4 pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-primary" />
                Daftar Riwayat Struk Transaksi
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Arsip 50 transaksi kasir terbaru dengan dukungan cetak ulang termal dan unduh HTML
              </CardDescription>
            </div>
            <div className="w-full sm:w-72 relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari ID struk, menu, pelanggan..."
                className="pl-8 h-8 text-xs bg-muted/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="[&_th]:py-2.5 [&_th]:text-xs">
                    <TableHead className="w-36">Waktu</TableHead>
                    <TableHead className="w-32">No. Struk</TableHead>
                    <TableHead className="min-w-[200px]">Rincian Item</TableHead>
                    <TableHead className="text-right w-28">Total Belanja</TableHead>
                    <TableHead className="text-center w-28">Metode</TableHead>
                    <TableHead className="text-right w-44">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-32 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-xs text-muted-foreground">
                        {searchQuery
                          ? `Tidak ditemukan struk dengan kata kunci "${searchQuery}"`
                          : 'Belum ada data transaksi tersimpan.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                      const totalAmount = order.total || order.gross_revenue || 0;
                      const isCash = (order.payment_method || '').toLowerCase() === 'tunai' || (order.payment_method || '').toLowerCase() === 'cash';
                      const itemsSummary = (order.items || [])
                        .map((i) => `${i.name} (${i.quantity})`)
                        .join(', ');

                      return (
                        <TableRow key={order.id} className="text-xs hover:bg-muted/40 transition-colors [&_td]:py-2.5">
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {format(parseSafeDate(order.created_at || order.timestamp), 'dd/MM/yyyy HH:mm', { locale: idLocale })}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-foreground whitespace-nowrap">
                            {order.id}
                          </TableCell>
                          <TableCell className="text-foreground max-w-xs truncate" title={itemsSummary}>
                            {itemsSummary || '-'}
                          </TableCell>
                          <TableCell className="text-right font-black text-foreground whitespace-nowrap">
                            {formatCurrency(totalAmount)}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold gap-1 ${
                                isCash
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              {isCash ? <Banknote className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}
                              {order.payment_method || 'Tunai'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                                onClick={() => handlePreview(order)}
                                title="Lihat Tampilan Struk"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => handleDownload(order)}
                                title="Unduh File HTML Struk"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">HTML</span>
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 px-2.5 text-xs font-bold gap-1 shadow-xs"
                                onClick={() => handlePrint(order)}
                                title="Cetak Ulang ke Printer"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Cetak
                              </Button>
                            </div>
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

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              Tinjauan Struk Pembayaran
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Simulasi tampilan cetak struk kasir termal 80mm
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="my-2 overflow-y-auto max-h-[60vh] py-2">
              <Receipt order={selectedOrder} />
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1"
              onClick={() => selectedOrder && handleDownload(selectedOrder)}
            >
              <Download className="h-3.5 w-3.5" />
              Unduh HTML
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-xs font-bold gap-1"
              onClick={() => selectedOrder && handlePrint(selectedOrder)}
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak Struk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
