/**
 * @fileOverview Genkit tools for interacting with Supabase database.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export const addMenuItemTool = ai.defineTool(
  {
    name: 'addMenuItem',
    description: 'Adds a new item to the bakery menu.',
    inputSchema: z.object({
      name: z.string().describe('The name of the menu item.'),
      category: z.string().describe('The category of the item (e.g., Roti Manis, Roti Tawar).'),
      price: z.number().describe('The price of the item.'),
      availability: z.boolean().default(true).describe('Whether the item is available for sale.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      await supabase.from('menu_items').insert([{
        name: input.name,
        category: input.category,
        price: input.price,
        availability: input.availability,
      }]);
      return `Berhasil menambahkan "${input.name}" ke menu bakery.`;
    } catch (e) {
      return 'Gagal menambahkan produk roti.';
    }
  }
);

export const editMenuItemPriceTool = ai.defineTool(
  {
    name: 'editMenuItemPrice',
    description: 'Updates the price of an existing menu item.',
    inputSchema: z.object({
      name: z.string().describe('The name of the menu item to update.'),
      newPrice: z.number().describe('The new price for the item.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      await supabase.from('menu_items').update({ price: input.newPrice }).ilike('name', input.name);
      return `Berhasil mengubah harga "${input.name}" menjadi Rp ${input.newPrice}.`;
    } catch (e) {
      return 'Gagal memperbarui harga menu.';
    }
  }
);

export const deleteMenuItemTool = ai.defineTool(
  {
    name: 'deleteMenuItem',
    description: 'Deletes a menu item from the bakery menu.',
    inputSchema: z.object({
      name: z.string().describe('The name of the menu item to delete.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      await supabase.from('menu_items').delete().ilike('name', input.name);
      return `Berhasil menghapus "${input.name}" dari menu.`;
    } catch (e) {
      return 'Gagal menghapus menu item.';
    }
  }
);

export const getInventoryStockTool = ai.defineTool(
  {
    name: 'getInventoryStock',
    description: 'Retrieves current stock for a specific ingredient.',
    inputSchema: z.object({
      name: z.string().describe('The name of the ingredient.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const { data } = await supabase.from('inventory').select('*').ilike('name', `%${input.name}%`);
      if (data && data.length > 0) {
        return `Stok ${data[0].name}: ${data[0].quantity} ${data[0].unit_type || 'unit'}.`;
      }
      return `Bahan "${input.name}" tidak ditemukan di database.`;
    } catch (e) {
      return 'Gagal mengecek stok bahan.';
    }
  }
);

export const addOrUpdateInventoryItemTool = ai.defineTool(
  {
    name: 'addOrUpdateInventoryItem',
    description: 'Adds or updates an inventory item.',
    inputSchema: z.object({
      name: z.string().describe('The name of the ingredient.'),
      quantity: z.number().describe('Quantity of the ingredient.'),
      unitType: z.string().default('kg').describe('Unit type (e.g. kg, liter).'),
      category: z.string().default('Tepung & Ragi').describe('Category.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      await supabase.from('inventory').upsert([{
        name: input.name,
        quantity: input.quantity,
        unit_type: input.unitType,
        category: input.category,
      }]);
      return `Berhasil memperbarui data stok "${input.name}".`;
    } catch (e) {
      return 'Gagal memperbarui stok.';
    }
  }
);

export const setInventoryItemQuantityTool = ai.defineTool(
  {
    name: 'setInventoryItemQuantity',
    description: 'Sets the quantity of an inventory item.',
    inputSchema: z.object({
      name: z.string().describe('Ingredient name.'),
      quantity: z.number().describe('New quantity.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      await supabase.from('inventory').update({ quantity: input.quantity }).ilike('name', input.name);
      return `Jumlah stok "${input.name}" diset ke ${input.quantity}.`;
    } catch (e) {
      return 'Gagal mengatur jumlah stok.';
    }
  }
);

export const getLowStockItemsTool = ai.defineTool(
  {
    name: 'getLowStockItems',
    description: 'Lists all ingredients currently low on stock.',
    inputSchema: z.object({}),
    outputSchema: z.string(),
  },
  async () => {
    try {
      const { data } = await supabase.from('inventory').select('*');
      const low = (data || []).filter((i: any) => i.quantity <= (i.min_threshold || 5));
      if (low.length === 0) return 'Seluruh stok bahan baku aman.';
      return `Bahan menipis: ${low.map((i: any) => `${i.name} (${i.quantity})`).join(', ')}`;
    } catch (e) {
      return 'Gagal mengambil data bahan menipis.';
    }
  }
);

export const deleteInventoryItemTool = ai.defineTool(
  {
    name: 'deleteInventoryItem',
    description: 'Deletes an ingredient from inventory.',
    inputSchema: z.object({
      name: z.string().describe('Ingredient name to delete.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      await supabase.from('inventory').delete().ilike('name', input.name);
      return `Berhasil menghapus "${input.name}" dari stok bahan.`;
    } catch (e) {
      return 'Gagal menghapus bahan.';
    }
  }
);
