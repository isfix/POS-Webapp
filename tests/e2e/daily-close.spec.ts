import { test, expect } from '@playwright/test';

test.describe('Daily Cash Reconciliation Flow (tests/e2e/daily-close.spec.ts)', () => {
  test('Open shift and count cash with exact zero variance', async ({ page }) => {
    // Seed demo authentication and today's orders
    await page.addInitScript(() => {
      localStorage.setItem('rotikita_auth_demo', JSON.stringify({
        id: 'demo-kasir-uid',
        email: 'manager@rotikita.local',
        displayName: 'Manajer Toko',
        user_metadata: { role: 'manajer', name: 'Manajer Toko' }
      }));

      // Seed 1 cash order for today
      localStorage.setItem('rotikita_orders', JSON.stringify([
        {
          id: 'ord-today-cash-01',
          created_at: new Date().toISOString(),
          items: [{ id: 'm1', name: 'Roti Cokelat Klasik', price: 50000, quantity: 1 }],
          gross_revenue: 50000,
          total: 50000,
          payment_method: 'Tunai',
          status: 'Completed',
        }
      ]));

      // Clear any prior reconciliation for today
      localStorage.removeItem('rotikita_cash_reconciliations');
    });

    await page.goto('/reports/daily-close');

    // Verify page header
    await expect(page.locator('h1').filter({ hasText: /Rekonsiliasi & Tutup Kasir Harian/i })).toBeVisible({ timeout: 15000 });

    const openShiftBtn = page.getByTestId('open-shift-btn');
    const countedInput = page.getByTestId('counted-cash-input');

    // Wait until UI loads either the Open Shift prompt or the Count input
    await expect(openShiftBtn.or(countedInput)).toBeVisible({ timeout: 15000 });

    if (await openShiftBtn.isVisible()) {
      const floatInput = page.getByTestId('opening-float-input');
      await floatInput.fill('200000');
      await openShiftBtn.click();
    }

    // Verify cash count input appears (Shift is opened)
    await expect(countedInput).toBeVisible({ timeout: 15000 });

    // Expected total in drawer = 200.000 (float) + 50.000 (cash sales) = 250.000
    // Fill exact counted cash
    await countedInput.fill('250000');

    // Verify live variance banner displays Pas / Sesuai
    const varianceBanner = page.getByTestId('variance-banner');
    await expect(varianceBanner).toBeVisible({ timeout: 15000 });
    await expect(varianceBanner).toContainText(/Uang Fisik Sempurna \/ Pas/i);

    // Step 2: Close Shift
    const closeShiftBtn = page.getByTestId('close-shift-btn');
    await expect(closeShiftBtn).toBeEnabled({ timeout: 15000 });
    await closeShiftBtn.click();

    // Verify toast or updated status
    await expect(page.locator('text=Tutup Kasir').first()).toBeVisible({ timeout: 15000 });
  });

  test('Detects cash discrepancy when counted amount differs from expected', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('rotikita_auth_demo', JSON.stringify({
        id: 'demo-kasir-uid',
        email: 'manager@rotikita.local',
        displayName: 'Manajer Toko',
        user_metadata: { role: 'manajer', name: 'Manajer Toko' }
      }));

      localStorage.setItem('rotikita_orders', JSON.stringify([
        {
          id: 'ord-today-cash-02',
          created_at: new Date().toISOString(),
          items: [{ id: 'm1', name: 'Roti Keju', price: 100000, quantity: 1 }],
          gross_revenue: 100000,
          total: 100000,
          payment_method: 'Tunai',
          status: 'Completed',
        }
      ]));

      // Clear any prior reconciliation
      localStorage.removeItem('rotikita_cash_reconciliations');
    });

    await page.goto('/reports/daily-close');

    const openShiftBtn = page.getByTestId('open-shift-btn');
    const countedInput = page.getByTestId('counted-cash-input');

    // Wait until UI loads either the Open Shift prompt or the Count input
    await expect(openShiftBtn.or(countedInput)).toBeVisible({ timeout: 15000 });

    if (await openShiftBtn.isVisible()) {
      const floatInput = page.getByTestId('opening-float-input');
      await floatInput.fill('100000');
      await openShiftBtn.click();
    }

    await expect(countedInput).toBeVisible({ timeout: 15000 });

    // Expected total in drawer = 100.000 (float) + 100.000 (cash sales) = 200.000
    // Fill counted cash with discrepancy: 150.000 (Kurang Rp 50.000)
    await countedInput.fill('150000');

    // Verify live variance banner displays discrepancy
    const varianceBanner = page.getByTestId('variance-banner');
    await expect(varianceBanner).toBeVisible({ timeout: 15000 });
    await expect(varianceBanner).toContainText(/Uang Fisik Kurang/i);

    // Optional notes
    const notesInput = page.getByTestId('recon-notes-input');
    await notesInput.fill('Selisih uang kas kecil');

    // Close Shift with discrepancy
    const closeShiftBtn = page.getByTestId('close-shift-btn');
    await closeShiftBtn.click();

    // Verify discrepancy status badge is displayed
    await expect(page.locator('text=Ada Selisih').or(page.locator('text=Selisih')).first()).toBeVisible({ timeout: 15000 });
  });
});
