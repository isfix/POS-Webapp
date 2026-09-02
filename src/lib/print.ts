/**
 * RotiKita Bakery POS - Thermal Receipt Printing Helper
 * Supports 80mm/58mm thermal receipt formatting, hidden iframe browser printing,
 * and standalone offline HTML receipt generation.
 */

export type ReceiptOrderItem = {
  id?: string;
  name: string;
  category?: string;
  price: number;
  cost_price?: number;
  quantity: number;
};

export type OrderData = {
  id: string;
  created_at?: string;
  timestamp?: string;
  items: ReceiptOrderItem[];
  gross_revenue?: number;
  total_cost?: number;
  total_profit?: number;
  total: number;
  payment_method: string;
  cash_given?: number;
  change_due?: number;
  customer_name?: string;
  status?: string;
};

export type BakerySettings = {
  name?: string;
  address?: string;
  phone?: string;
  receiptFooter?: string;
};

export const DEFAULT_BAKERY_SETTINGS: BakerySettings = {
  name: 'RotiKita Bakery',
  address: 'Jl. Contoh No. 123, Jakarta',
  phone: '0812-3456-7890',
  receiptFooter: 'Terima Kasih Atas Kunjungan Anda\nSimpan struk ini sebagai bukti pembayaran yang sah',
};

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
 * Generates standalone, inline-styled thermal receipt HTML.
 */
export function generateReceiptHTML(order: OrderData, settings?: BakerySettings): string {
  const bakery = { ...DEFAULT_BAKERY_SETTINGS, ...settings };
  const dateStr = formatReceiptDate(order.created_at || order.timestamp);
  const items = order.items || [];
  const totalAmount = order.total || order.gross_revenue || 0;
  const paymentMethod = order.payment_method || 'Tunai';
  const isCash = paymentMethod.toLowerCase() === 'cash' || paymentMethod.toLowerCase() === 'tunai';
  const cashGiven = order.cash_given || totalAmount;
  const changeDue = order.change_due || (isCash ? Math.max(0, cashGiven - totalAmount) : 0);

  const itemRows = items.map((item) => {
    const itemSubtotal = item.price * item.quantity;
    return `
      <tr>
        <td style="padding: 2px 0; font-weight: bold; word-break: break-word;" colspan="2">${escapeHTML(item.name)}</td>
      </tr>
      <tr>
        <td style="padding-bottom: 4px; color: #333; font-size: 11px;">
          ${item.quantity}x @ ${formatRupiah(item.price)}
        </td>
        <td style="padding-bottom: 4px; text-align: right; font-weight: bold; font-size: 11px;">
          ${formatRupiah(itemSubtotal)}
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Struk - ${escapeHTML(order.id)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Courier New', Courier, monospace, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      display: flex;
      justify-content: center;
      padding: 8px 4px;
    }
    .receipt-container {
      width: 100%;
      max-width: 78mm;
      padding: 4px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .dashed-divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    .header-title {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .header-sub {
      font-size: 10px;
      color: #222;
      margin-bottom: 2px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      margin-bottom: 2px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 11px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;
      font-weight: 900;
    }
    .footer-text {
      font-size: 10px;
      color: #333;
      text-align: center;
      margin-top: 8px;
      white-space: pre-line;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Header -->
    <div class="text-center">
      <div class="header-title">${escapeHTML(bakery.name || 'RotiKita Bakery')}</div>
      <div class="header-sub">${escapeHTML(bakery.address || '')}</div>
      ${bakery.phone ? `<div class="header-sub">Telp: ${escapeHTML(bakery.phone)}</div>` : ''}
    </div>

    <div class="dashed-divider"></div>

    <!-- Metadata -->
    <div class="meta-row">
      <span>No. Struk:</span>
      <span class="bold">${escapeHTML(order.id)}</span>
    </div>
    <div class="meta-row">
      <span>Waktu:</span>
      <span>${escapeHTML(dateStr)}</span>
    </div>
    <div class="meta-row">
      <span>Pelanggan:</span>
      <span>${escapeHTML(order.customer_name || 'Walk-in Customer')}</span>
    </div>

    <div class="dashed-divider"></div>

    <!-- Items -->
    <table class="items-table">
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="dashed-divider"></div>

    <!-- Summary -->
    <div class="summary-row">
      <span>Total Item (${items.reduce((sum, i) => sum + i.quantity, 0)} pcs):</span>
      <span>${formatRupiah(totalAmount)}</span>
    </div>

    <div class="total-row">
      <span>TOTAL AKHIR:</span>
      <span>${formatRupiah(totalAmount)}</span>
    </div>

    <div class="dashed-divider"></div>

    <!-- Payment info -->
    <div class="summary-row">
      <span>Metode Bayar:</span>
      <span class="bold">${escapeHTML(paymentMethod)}</span>
    </div>
    ${isCash ? `
      <div class="summary-row">
        <span>Tunai Diterima:</span>
        <span>${formatRupiah(cashGiven)}</span>
      </div>
      <div class="summary-row">
        <span>Kembalian:</span>
        <span class="bold">${formatRupiah(changeDue)}</span>
      </div>
    ` : `
      <div class="summary-row">
        <span>Status Transaksi:</span>
        <span class="bold">LUNAS (QRIS)</span>
      </div>
    `}

    <div class="double-divider"></div>

    <!-- Footer -->
    <div class="footer-text">${escapeHTML(bakery.receiptFooter || '')}</div>
  </div>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Triggers thermal receipt printing using a hidden iframe to prevent popup blocker issues.
 */
export async function printReceipt(order: OrderData, settings?: BakerySettings): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = 'about:blank';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        if (iframe.parentNode) document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      const receiptHTML = generateReceiptHTML(order, settings);
      iframeDoc.open();
      iframeDoc.write(receiptHTML);
      iframeDoc.close();

      const win = iframe.contentWindow;
      if (!win) {
        if (iframe.parentNode) document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      };

      win.onafterprint = () => {
        cleanup();
        resolve(true);
      };

      setTimeout(() => {
        try {
          win.focus();
          win.print();
          // Fallback resolve
          setTimeout(() => {
            cleanup();
            resolve(true);
          }, 2000);
        } catch {
          cleanup();
          resolve(false);
        }
      }, 250);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Downloads standalone HTML receipt file for offline archiving and printing.
 */
export function downloadReceiptHTML(order: OrderData, settings?: BakerySettings): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  try {
    const html = generateReceiptHTML(order, settings);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Struk_${order.id || 'order'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download receipt HTML:', error);
  }
}
