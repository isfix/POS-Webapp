'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { withFallback } from '@/lib/db';
import { type OrderData } from '@/lib/print';
import { ReceiptHistory } from '@/components/pos/receipt-history';
import { Button } from '@/components/ui/button';
import { RefreshCw, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ReceiptsReportPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    const loadedOrders = await withFallback<OrderData>(
      () =>
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
      'rotikita_orders',
      {
        fallbackDefault: [],
        transform: (data) =>
          data.map((row: any) => ({
            id: row.id,
            created_at: row.created_at,
            timestamp: row.timestamp,
            items: row.items || [],
            gross_revenue: Number(row.gross_revenue || row.total || 0),
            total_cost: Number(row.total_cost || 0),
            total_profit: Number(row.total_profit || 0),
            total: Number(row.total || row.gross_revenue || 0),
            payment_method: row.payment_method || 'Tunai',
            cash_given: Number(row.cash_given || row.total || 0),
            change_due: Number(row.change_due || 0),
            customer_name: row.customer_name || 'Walk-in Customer',
            status: row.status || 'Completed',
          })),
      }
    );
    setOrders(loadedOrders);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRefresh = async () => {
    await fetchOrders();
    toast({ title: 'Data Diperbarui', description: 'Daftar riwayat struk berhasil disinkronkan.' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Riwayat Struk Pembayaran
          </h1>
          <p className="text-xs text-muted-foreground">
            Daftar arsip transaksi POS kasir. Pilih struk untuk dicetak ulang ke printer termal atau disimpan sebagai berkas HTML.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="h-8 text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Main Table */}
      <ReceiptHistory orders={orders} loading={loading} onRefresh={fetchOrders} />
    </div>
  );
}
