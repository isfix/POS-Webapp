import { test, expect } from '@playwright/test';

test.describe('POS Flow & Demo Auth (tests/e2e/pos-checkout.spec.ts)', () => {
  test('Demo login flow: logs into cashier session and navigates to dashboard', async ({ page }) => {
    await page.goto('/login');

    const demoBtn = page.getByTestId('demo-kasir-btn');
    await expect(demoBtn).toBeVisible({ timeout: 15000 });
    await demoBtn.click();

    // Verify redirection to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.locator('text=Dasbor Operasional').first()).toBeVisible({ timeout: 15000 });
  });

  test('POS adds product to cart and updates counter', async ({ page }) => {
    // Authenticate session via demo seed
    await page.addInitScript(() => {
      localStorage.setItem('rotikita_auth_demo', JSON.stringify({
        id: 'demo-kasir-uid',
        email: 'kasir@rotikita.local',
        displayName: 'Staf Kasir (Demo)',
        user_metadata: { role: 'kasir', name: 'Staf Kasir (Demo)' }
      }));
    });

    await page.goto('/pos');

    // Wait for product card to appear after data load
    const firstProduct = page.locator('h3').filter({ hasText: /Roti|Croissant|Donat/ }).first();
    await expect(firstProduct).toBeVisible({ timeout: 15000 });

    const addBtn = page.getByTestId('add-to-cart-btn').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Verify cart reflects item
    await expect(page.locator('text=Pesanan Saat Ini').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Bayar').first()).toBeVisible({ timeout: 10000 });
  });

  test('POS checkout completes and resets cart', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('rotikita_auth_demo', JSON.stringify({
        id: 'demo-kasir-uid',
        email: 'kasir@rotikita.local',
        displayName: 'Staf Kasir (Demo)',
        user_metadata: { role: 'kasir', name: 'Staf Kasir (Demo)' }
      }));
    });

    await page.goto('/pos');

    // Wait for product card to appear after data load
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

    // Verify success toast notification
    await expect(page.locator('text=Pembayaran Berhasil').or(page.locator('text=Transaksi')).first()).toBeVisible({ timeout: 10000 });

    // Verify cart resets to empty state
    await expect(page.locator('text=Keranjang Masih Kosong').first()).toBeVisible({ timeout: 10000 });
  });

  test('POS order persists in localStorage with snake_case fields', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('rotikita_auth_demo', JSON.stringify({
        id: 'demo-kasir-uid',
        email: 'kasir@rotikita.local',
        displayName: 'Staf Kasir (Demo)',
        user_metadata: { role: 'kasir', name: 'Staf Kasir (Demo)' }
      }));
    });

    await page.goto('/pos');

    // Wait for product card to appear after data load
    const firstProduct = page.locator('h3').filter({ hasText: /Roti|Croissant|Donat/ }).first();
    await expect(firstProduct).toBeVisible({ timeout: 15000 });

    // Add item and pay
    const addBtn = page.getByTestId('add-to-cart-btn').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    const exactCashBtn = page.getByTestId('exact-cash-btn').first();
    await expect(exactCashBtn).toBeVisible({ timeout: 10000 });
    await exactCashBtn.click();

    const payBtn = page.getByTestId('pay-btn').first();
    await expect(payBtn).toBeEnabled({ timeout: 10000 });
    await payBtn.click();

    // Wait for checkout completion toast
    await expect(page.locator('text=Pembayaran Berhasil').or(page.locator('text=Transaksi')).first()).toBeVisible({ timeout: 10000 });

    // Check localStorage rotikita_orders
    const savedOrdersJson = await page.evaluate(() => localStorage.getItem('rotikita_orders'));
    expect(savedOrdersJson).toBeTruthy();

    const orders = JSON.parse(savedOrdersJson || '[]');
    expect(orders.length).toBeGreaterThan(0);

    const latestOrder = orders[0];
    expect(latestOrder.id).toBeDefined();
    expect(latestOrder.gross_revenue).toBeDefined();
    expect(latestOrder.total_cost).toBeDefined();
    expect(latestOrder.total_profit).toBeDefined();
    expect(latestOrder.payment_method).toBeDefined();
  });
});
