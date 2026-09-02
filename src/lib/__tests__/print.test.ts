import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateReceiptHTML, printReceipt, downloadReceiptHTML, type OrderData } from '../print';

describe('Receipt Printing Utility (src/lib/print.ts)', () => {
  const sampleCashOrder: OrderData = {
    id: 'ord-test-12345',
    created_at: '2026-09-02T10:30:00.000Z',
    items: [
      { id: 'm1', name: 'Roti Cokelat Klasik', price: 12000, quantity: 2 },
      { id: 'm2', name: 'Croissant Butter', price: 22000, quantity: 1 },
    ],
    gross_revenue: 46000,
    total: 46000,
    payment_method: 'Tunai',
    cash_given: 50000,
    change_due: 4000,
    customer_name: 'Budi Santoso',
    status: 'Completed',
  };

  const sampleQrisOrder: OrderData = {
    id: 'ord-test-67890',
    created_at: '2026-09-02T11:15:00.000Z',
    items: [
      { id: 'm3', name: 'Roti Keju Spesial', price: 15000, quantity: 3 },
    ],
    gross_revenue: 45000,
    total: 45000,
    payment_method: 'QRIS',
    customer_name: 'Walk-in Customer',
    status: 'Completed',
  };

  describe('generateReceiptHTML', () => {
    it('generates HTML containing bakery header and order ID', () => {
      const html = generateReceiptHTML(sampleCashOrder);
      expect(html).toContain('RotiKita Bakery');
      expect(html).toContain('ord-test-12345');
      expect(html).toContain('Budi Santoso');
      expect(html).toContain('Roti Cokelat Klasik');
      expect(html).toContain('Croissant Butter');
    });

    it('formats currency in Indonesian Rupiah and calculates totals', () => {
      const html = generateReceiptHTML(sampleCashOrder);
      expect(html).toContain('46.000');
      expect(html).toContain('50.000');
      expect(html).toContain('4.000');
      expect(html).toContain('Metode Bayar:');
      expect(html).toContain('Tunai');
    });

    it('renders QRIS transaction badge when payment method is QRIS', () => {
      const html = generateReceiptHTML(sampleQrisOrder);
      expect(html).toContain('LUNAS (QRIS)');
      expect(html).toContain('ord-test-67890');
      expect(html).toContain('45.000');
    });

    it('escapes dangerous HTML characters in product names and customer names', () => {
      const maliciousOrder: OrderData = {
        id: 'ord-<script>alert(1)</script>',
        items: [{ id: 'm1', name: '<img src=x onerror=alert(1)> Roti', price: 10000, quantity: 1 }],
        total: 10000,
        payment_method: 'Tunai',
        customer_name: '<b>Hacker</b>',
      };
      const html = generateReceiptHTML(maliciousOrder);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x');
      expect(html).toContain('&lt;b&gt;Hacker&lt;/b&gt;');
    });

    it('accepts custom bakery settings overrides', () => {
      const html = generateReceiptHTML(sampleCashOrder, {
        name: 'Toko Roti Nusantara',
        address: 'Jl. Merdeka No. 45, Bandung',
        phone: '0811-2233-4455',
        receiptFooter: 'Terima kasih telah berbelanja di Cabang Bandung',
      });
      expect(html).toContain('Toko Roti Nusantara');
      expect(html).toContain('Jl. Merdeka No. 45, Bandung');
      expect(html).toContain('0811-2233-4455');
      expect(html).toContain('Terima kasih telah berbelanja di Cabang Bandung');
    });
  });

  describe('downloadReceiptHTML', () => {
    it('creates a download link and triggers click', () => {
      let clicked = false;
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clicked = true;
      });

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/dummy');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      downloadReceiptHTML(sampleCashOrder);

      expect(clicked).toBe(true);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();

      clickSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('printReceipt', () => {
    it('creates iframe, writes HTML content, and invokes print', async () => {
      const mockDoc = {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      };

      const mockWin = {
        document: mockDoc,
        focus: vi.fn(),
        print: vi.fn(),
        onafterprint: null as any,
      };

      const mockIframe = {
        style: {},
        src: '',
        contentWindow: mockWin,
        parentNode: document.body,
      };

      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'iframe') return mockIframe as any;
        return document.createElement(tag);
      });

      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

      const printPromise = printReceipt(sampleCashOrder);

      // Simulate afterprint event
      setTimeout(() => {
        if (typeof mockWin.onafterprint === 'function') {
          mockWin.onafterprint();
        }
      }, 50);

      const result = await printPromise;
      expect(result).toBe(true);
      expect(mockDoc.open).toHaveBeenCalled();
      expect(mockDoc.write).toHaveBeenCalled();
      expect(mockDoc.close).toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });
});
