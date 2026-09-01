/**
 * @fileOverview A conversational AI agent for managing the bakery.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  addMenuItemTool,
  editMenuItemPriceTool,
  deleteMenuItemTool,
  getInventoryStockTool,
  addOrUpdateInventoryItemTool,
  setInventoryItemQuantityTool,
  getLowStockItemsTool,
  deleteInventoryItemTool,
} from '@/ai/tools/cafe-management-tools';

const ConversationPartSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ConversationalAgentInputSchema = z.object({
  prompt: z.string(),
  history: z.array(ConversationPartSchema),
});

type ConversationalAgentInput = z.infer<typeof ConversationalAgentInputSchema>;

export async function runConversationalAgent(
  input: ConversationalAgentInput
): Promise<string> {
  const validatedInput = ConversationalAgentInputSchema.parse(input);
  const { prompt, history } = validatedInput;

  const formattedMessages = [
    ...history.map((part) => ({
      role: part.role,
      content: [{ text: part.content }],
    })),
    {
      role: 'user' as const,
      content: [{ text: prompt }],
    },
  ];

  const llmResponse = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    messages: formattedMessages,
    tools: [
      addMenuItemTool,
      editMenuItemPriceTool,
      deleteMenuItemTool,
      deleteInventoryItemTool,
      getInventoryStockTool,
      addOrUpdateInventoryItemTool,
      setInventoryItemQuantityTool,
      getLowStockItemsTool,
    ],
    system: `Anda adalah asisten AI cerdas untuk sistem kasir POS dan manajemen operasional toko. Anda membantu kasir dan staf dalam mengelola katalog produk dan stok persediaan barang.

- Gunakan Bahasa Indonesia yang ramah, ringkas, dan jelas.
- Selalu gunakan tools yang disediakan jika pengguna meminta menambah, mengubah, menghapus menu, atau mengecek stok.
- Untuk pasokan baru bahan baku: gunakan 'addOrUpdateInventoryItemTool'.
- Untuk menghitung ulang / menimpa jumlah stok: gunakan 'setInventoryItemQuantityTool'.

**Alur Konfirmasi Aksi Destruktif (Hapus atau Timpa Stok):**
1. Jika pengguna meminta menghapus produk roti atau mengubah paksa stok inventaris, wajib minta konfirmasi terlebih dahulu dengan awalan \`[CONFIRM]\`. Contoh: \`[CONFIRM] Apakah Anda yakin ingin menghapus 'Roti Cokelat' dari katalog?\`
2. Jika pengguna mengonfirmasi, Anda akan menerima \`User confirmed the action.\`. Jalankan tool yang diminta berdasarkan riwayat percakapan sebelumnya.`,
  });

  return llmResponse.text;
}
