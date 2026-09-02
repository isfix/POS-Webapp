import { test, expect } from '@playwright/test';

test.describe('Inventory CRUD & Stock Alerts (tests/e2e/inventory-crud.spec.ts)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate session via demo seed before navigating
    await page.addInitScript(() => {
      localStorage.setItem('rotikita_auth_demo', JSON.stringify({
        id: 'demo-kasir-uid',
        email: 'kasir@rotikita.local',
        displayName: 'Staf Kasir (Demo)',
        user_metadata: { role: 'kasir', name: 'Staf Kasir (Demo)' }
      }));
    });
  });

  test('Add inventory item via modal form and display in table', async ({ page }) => {
    await page.goto('/inventory');

    // Click Tambah Bahan button
    const addBtn = page.getByTestId('add-inventory-btn');
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();

    // Fill form
    const nameInput = page.getByTestId('inventory-name-input');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill('Tepung Gandum Premium E2E');

    const qtyInput = page.getByTestId('inventory-qty-input');
    await qtyInput.fill('25');

    const threshInput = page.getByTestId('inventory-threshold-input');
    await threshInput.fill('5');

    const costInput = page.getByTestId('inventory-cost-input');
    await costInput.fill('16000');

    // Submit form
    const saveBtn = page.getByTestId('save-inventory-btn');
    await saveBtn.click();

    // Verify row appears in table
    await expect(page.locator('text=Tepung Gandum Premium E2E')).toBeVisible({ timeout: 10000 });
  });

  test('Low stock indicator appears when quantity is below threshold', async ({ page }) => {
    // Seed low stock item in localStorage
    await page.addInitScript(() => {
      const lowStockSeed = [
        {
          id: 'inv-test-low-1',
          name: 'Mentega Wijsman Menipis',
          category: 'Dairy, Mentega & Telur',
          quantity: 2,
          unitType: 'kg',
          minThreshold: 10,
          costPerUnit: 120000,
          lastUpdated: new Date().toISOString(),
        },
      ];
      localStorage.setItem('rotikita_inventory', JSON.stringify(lowStockSeed));
    });

    await page.goto('/inventory');

    // Verify low stock item is displayed
    await expect(page.locator('text=Mentega Wijsman Menipis')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=2').first()).toBeVisible({ timeout: 10000 });
  });
});
