import { test, expect } from '@playwright/test';

test.describe('Receipt Printing & Receipt History Flow (tests/e2e/receipt.spec.ts)', () => {
  test('POS checkout opens receipt dialog with thermal receipt preview and actions', async ({ page }) => {
    // Authenticate demo session
    await page.addInitScript(() => {
      localStorage.setItem('rotikita_auth_demo', JSON.stringify({
        id: 'demo-kasir-uid',
        email: 'kasir@rotikita.local',
        displayName: 'Staf Kasir (Demo)',
        user_metadata: { role: 'kasir', name: 'Staf Kasir (Demo)' }
      }));
    });

    await page.goto('/pos');

    // Wait for product card to appear
    const firstProduct = page.locator('h3').filter({ hasText: /Roti|Croissant|Donat/ }).first();
    await expect(firstProduct).toBeVisible({ timeout: 15000 });

    // Add item to cart
    const addBtn = page.getByTestId('add-to-cart-btn').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Select exact cash amount
    const exactCashBtn = page.getByTestId('exact-cash-btn').first();
    await expect(exactCashBtn).toBeVisible({ timeout: 10000 });
    await exactCashBtn.click();

    // Pay now
    const payBtn = page.getByTestId('pay-btn').first();
    await expect(payBtn).toBeEnabled({ timeout: 10000 });
    await payBtn.click();

    // Verify receipt modal opens with Transaksi Berhasil
    await expect(page.locator('text=Transaksi Berhasil').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=RotiKita Bakery').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=TOTAL AKHIR:').first()).toBeVisible({ timeout: 10000 });

    // Verify action buttons exist in modal
    const printBtn = page.getByRole('button', { name: /Cetak Struk/i }).first();
    const downloadBtn = page.getByRole('button', { name: /Unduh HTML/i }).first();
    const dismissBtn = page.getByRole('button', { name: /Lewati/i }).first();

    await expect(printBtn).toBeVisible({ timeout: 10000 });
    await expect(downloadBtn).toBeVisible({ timeout: 10000 });
    await expect(dismissBtn).toBeVisible({ timeout: 10000 });

    // Dismiss modal and verify cart is cleared
    await dismissBtn.click();
    await expect(page.locator('text=Transaksi Berhasil')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Keranjang Masih Kosong').first()).toBeVisible({ timeout: 10000 });
  });

  test('Receipts history page displays recent transactions and reprint triggers', async ({ page }) => {
    // Seed localStorage with test orders
    await page.addInitScript(() => {
      localStorage.setItem('rotikita_auth_demo', JSON.stringify({
        id: 'demo-kasir-uid',
        email: 'kasir@rotikita.local',
        displayName: 'Staf Kasir (Demo)',
        user_metadata: { role: 'kasir', name: 'Staf Kasir (Demo)' }
      }));

      localStorage.setItem('rotikita_orders', JSON.stringify([
        {
          id: 'ord-e2e-receipt-001',
          created_at: new Date().toISOString(),
          items: [
            { id: 'm1', name: 'Roti Cokelat Klasik', price: 12000, quantity: 2 },
            { id: 'm2', name: 'Croissant Butter', price: 22000, quantity: 1 }
          ],
          gross_revenue: 46000,
          total: 46000,
          payment_method: 'Tunai',
          cash_given: 50000,
          change_due: 4000,
          customer_name: 'Walk-in Customer',
          status: 'Completed'
        }
      ]));
    });

    await page.goto('/reports/receipts');

    // Verify page header
    await expect(page.locator('h1').filter({ hasText: /Riwayat Struk Pembayaran/i })).toBeVisible({ timeout: 15000 });

    // Verify table displays seeded order
    await expect(page.locator('text=ord-e2e-receipt-001').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Roti Cokelat Klasik (2)').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Tunai').first()).toBeVisible({ timeout: 10000 });

    // Verify action buttons exist in the table row
    const cetakBtn = page.getByRole('button', { name: /Cetak/i }).first();
    const htmlBtn = page.getByRole('button', { name: /HTML/i }).first();
    await expect(cetakBtn).toBeVisible({ timeout: 10000 });
    await expect(htmlBtn).toBeVisible({ timeout: 10000 });
  });
});
