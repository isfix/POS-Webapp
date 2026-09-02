import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Receipt } from '../receipt';
import { type OrderData } from '@/lib/print';

describe('Receipt Component (src/components/pos/receipt.tsx)', () => {
  const sampleOrder: OrderData = {
    id: 'ord-test-receipt-999',
    created_at: '2026-09-02T08:00:00.000Z',
    items: [
      { id: '1', name: 'Roti Srikaya Panggang', price: 14000, quantity: 2 },
      { id: '2', name: 'Donat Gula Halus', price: 8000, quantity: 3 },
    ],
    gross_revenue: 52000,
    total: 52000,
    payment_method: 'Tunai',
    cash_given: 60000,
    change_due: 8000,
    customer_name: 'Ibu Ratna',
  };

  it('renders the bakery header, receipt number, and customer name', () => {
    const html = renderToStaticMarkup(React.createElement(Receipt, { order: sampleOrder }));

    expect(html).toContain('RotiKita Bakery');
    expect(html).toContain('ord-test-receipt-999');
    expect(html).toContain('Ibu Ratna');
  });

  it('renders all line items with quantity and formatted prices', () => {
    const html = renderToStaticMarkup(React.createElement(Receipt, { order: sampleOrder }));

    expect(html).toContain('Roti Srikaya Panggang');
    expect(html).toContain('Donat Gula Halus');
    expect(html).toContain('2x @');
    expect(html).toContain('3x @');
  });

  it('renders totals and payment breakdown in Indonesian currency format', () => {
    const html = renderToStaticMarkup(React.createElement(Receipt, { order: sampleOrder }));

    expect(html).toContain('TOTAL AKHIR:');
    expect(html).toContain('52.000');
    expect(html).toContain('Tunai Diterima:');
    expect(html).toContain('60.000');
    expect(html).toContain('Kembalian:');
    expect(html).toContain('8.000');
  });

  it('renders QRIS status when payment method is QRIS', () => {
    const qrisOrder: OrderData = {
      ...sampleOrder,
      payment_method: 'QRIS',
    };

    const html = renderToStaticMarkup(React.createElement(Receipt, { order: qrisOrder }));
    expect(html).toContain('LUNAS (QRIS)');
  });
});
