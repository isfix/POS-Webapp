import React from 'react';
import { type OrderData, type BakerySettings, DEFAULT_BAKERY_SETTINGS } from '@/lib/print';

interface ReceiptProps {
  order: OrderData;
  bakerySettings?: BakerySettings;
  className?: string;
}

const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatReceiptDate = (isoString?: string): string => {
  if (!isoString) {
    return new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) throw new Error('Invalid date');
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

/**
 * Thermal receipt component styled for 80mm roll paper simulation.
 * Includes inline styles and @media print support.
 */
export function Receipt({ order, bakerySettings, className = '' }: ReceiptProps) {
  const bakery = { ...DEFAULT_BAKERY_SETTINGS, ...bakerySettings };
  const dateStr = formatReceiptDate(order.created_at || order.timestamp);
  const items = order.items || [];
  const totalAmount = order.total || order.gross_revenue || 0;
  const paymentMethod = order.payment_method || 'Tunai';
  const isCash = paymentMethod.toLowerCase() === 'cash' || paymentMethod.toLowerCase() === 'tunai';
  const cashGiven = order.cash_given || totalAmount;
  const changeDue = order.change_due || (isCash ? Math.max(0, cashGiven - totalAmount) : 0);

  return (
    <div 
      className={`receipt-paper font-mono text-black bg-white p-4 max-w-[320px] mx-auto border border-dashed border-gray-300 rounded shadow-xs text-xs leading-tight select-text ${className}`}
      data-testid="thermal-receipt"
    >
      {/* Header */}
      <div className="text-center space-y-0.5 mb-2">
        <h2 className="text-base font-black tracking-wide uppercase">{bakery.name}</h2>
        <p className="text-[11px] text-gray-700">{bakery.address}</p>
        {bakery.phone && <p className="text-[11px] text-gray-700">Telp: {bakery.phone}</p>}
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* Metadata */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-gray-600">No. Struk:</span>
          <span className="font-bold">{order.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Waktu:</span>
          <span>{dateStr}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Pelanggan:</span>
          <span>{order.customer_name || 'Walk-in Customer'}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* Items Table */}
      <table className="w-full border-collapse my-1">
        <tbody>
          {items.map((item, index) => {
            const itemSubtotal = item.price * item.quantity;
            return (
              <React.Fragment key={item.id || index}>
                <tr>
                  <td colSpan={2} className="font-bold pt-1 pb-0.5 break-words">
                    {item.name}
                  </td>
                </tr>
                <tr className="text-[11px] text-gray-700 border-b border-gray-100 last:border-b-0">
                  <td className="pb-1 text-gray-600">
                    {item.quantity}x @ {formatRupiah(item.price)}
                  </td>
                  <td className="pb-1 text-right font-bold text-black">
                    {formatRupiah(itemSubtotal)}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-dashed border-black my-2" />

      {/* Totals */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Total Item ({items.reduce((sum, i) => sum + i.quantity, 0)} pcs):</span>
          <span>{formatRupiah(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm font-black pt-1">
          <span>TOTAL AKHIR:</span>
          <span>{formatRupiah(totalAmount)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* Payment Details */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Metode Bayar:</span>
          <span className="font-bold">{paymentMethod}</span>
        </div>
        {isCash ? (
          <>
            <div className="flex justify-between">
              <span>Tunai Diterima:</span>
              <span>{formatRupiah(cashGiven)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Kembalian:</span>
              <span>{formatRupiah(changeDue)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between font-bold text-emerald-700">
            <span>Status Transaksi:</span>
            <span>LUNAS (QRIS)</span>
          </div>
        )}
      </div>

      <div className="border-t-2 border-black my-3" />

      {/* Footer */}
      <div className="text-center text-[10px] text-gray-600 whitespace-pre-line space-y-0.5">
        <p className="font-bold text-black">Terima Kasih Atas Kunjungan Anda</p>
        <p>Simpan struk ini sebagai bukti pembayaran yang sah</p>
      </div>
    </div>
  );
}
