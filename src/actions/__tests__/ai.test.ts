import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runAgent, aiPoweredDataEntry, runGenerateDailyInsights } from '../ai';

describe('AI Action Helpers & Fallbacks (src/actions/ai.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('runAgent', () => {
    it('returns honest offline fallback message when fetch API fails or is offline', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const response = await runAgent('Halo Aura, bagaimana performa toko hari ini?', []);

      expect(response).toContain('Mode offline aktif');
    });

    it('returns AI response text when /api/ai/chat endpoint succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Halo! Stok dan penjualan toko roti berjalan lancar.' }),
      } as Response);

      const response = await runAgent('Halo', []);

      expect(response).toBe('Halo! Stok dan penjualan toko roti berjalan lancar.');
    });
  });

  describe('aiPoweredDataEntry', () => {
    it('returns parsedPrice 0 (no hardcoded fake price) when regex cannot find numeric price', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const result = await aiPoweredDataEntry({
        naturalLanguageInput: 'Tambahkan Roti Tawar Spesial tanpa harga',
      });

      expect(result.formData?.category).toBe('Roti Tawar');
      expect(result.formData?.price).toBe(0);
    });

    it('correctly parses price and category from Indonesian natural language offline heuristic', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const result = await aiPoweredDataEntry({
        naturalLanguageInput: 'Tambah menu Croissant Cokelat seharga 25.000',
      });

      expect(result.formData?.category).toBe('Pastry & Croissant');
      expect(result.formData?.price).toBe(25000);
    });
  });

  describe('runGenerateDailyInsights', () => {
    it('generates low stock warnings accurately from inventory data', async () => {
      const inventory = [
        { id: '1', name: 'Tepung Terigu', quantity: 2, minThreshold: 10, unitType: 'kg' },
        { id: '2', name: 'Gula Pasir', quantity: 50, minThreshold: 5, unitType: 'kg' },
      ];
      const sales = [
        { name: 'Roti Keju', quantity: 15, profit: 45000 },
      ];
      const assets = [
        { name: 'Oven Gas', status: 'Dalam Perbaikan' },
      ];

      const insights = await runGenerateDailyInsights({
        inventoryData: inventory,
        salesData: sales,
        assetData: assets,
      });

      expect(insights.lowStockItems.length).toBe(1);
      expect(insights.lowStockItems[0]).toContain('Tepung Terigu');
      expect(insights.topSellingItems[0]).toContain('Roti Keju');
      expect(insights.idleAssets[0]).toBe('Oven Gas');
      expect(insights.notifications.length).toBe(1);
    });
  });
});
