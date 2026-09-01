export type ConversationHistory = {
  role: 'user' | 'model';
  content: string;
}[];

// 1. Conversational Agent (Aura)
export async function runAgent(
  prompt: string,
  history: ConversationHistory
): Promise<string> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history }),
    });

    if (!response.ok) {
      return "Layanan asisten AI sedang tidak dapat diakses saat ini. Silakan coba beberapa saat lagi.";
    }

    const data = await response.json();
    return data.text || "Baik, saya siap membantu kebutuhan operasional toko Anda.";
  } catch (error) {
    console.error("Error in runAgent client:", error);
    return "Mode offline aktif. Konfigurasikan GEMINI_API_KEY di environment untuk mengaktifkan asisten AI cerdas.";
  }
}

// 2. Natural Language Data Entry
export async function aiPoweredDataEntry(input: { naturalLanguageInput: string }): Promise<{
  formData?: { name?: string; category?: string; price?: number };
}> {
  const text = String(input?.naturalLanguageInput || '');

  try {
    const response = await fetch('/api/ai/data-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ naturalLanguageInput: text }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.formData) {
        return data;
      }
    }
  } catch (err) {
    console.warn("AI parse API unavailable, using local heuristic:", err);
  }

  // Regex heuristic parser fallback for offline use
  const priceMatch = text.match(/(?:rp|harga|sebesar|rp\.)?\s*([\d.,]+(?:\s*rb|\s*ribu|\s*k)?)/i);
  let parsedPrice = 0;
  if (priceMatch) {
    let raw = priceMatch[1].replace(/[.,]/g, '').toLowerCase();
    if (raw.endsWith('rb') || raw.endsWith('ribu') || raw.endsWith('k')) {
      parsedPrice = parseInt(raw) * 1000;
    } else {
      parsedPrice = parseInt(raw) || 0;
    }
  }

  let category = 'Roti Manis';
  const lower = text.toLowerCase();
  if (lower.includes('tawar')) category = 'Roti Tawar';
  else if (lower.includes('cake') || lower.includes('tart') || lower.includes('bolu')) category = 'Cake & Tart';
  else if (lower.includes('pastry') || lower.includes('croissant') || lower.includes('danish')) category = 'Pastry & Croissant';
  else if (lower.includes('donat') || lower.includes('cookies') || lower.includes('kue kering')) category = 'Donat & Cookies';
  else if (lower.includes('minum') || lower.includes('kopi') || lower.includes('teh') || lower.includes('jus')) category = 'Minuman';

  let name = text
    .replace(/(tambah|buat|masukkan|menu|baru|kategori|harga|seharga|rp\.?|\d+)/gi, '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

  return {
    formData: {
      name: name || '',
      category,
      price: parsedPrice || 0,
    },
  };
}

// 3. Automated Daily Insights
export async function runGenerateDailyInsights(input: {
  salesData: any[];
  inventoryData: any[];
  assetData: any[];
}) {
  const lowStockItems: string[] = [];
  const notifications: any[] = [];

  // 1. Analyze low stock
  input.inventoryData.forEach(item => {
    if (item.quantity <= (item.minThreshold || 5)) {
      lowStockItems.push(`${item.name} menipis (sisa ${item.quantity} ${item.unitType || 'unit'})`);
      notifications.push({
        title: "Peringatan Stok Menipis",
        body: `Segera lakukan re-order ${item.name} (Sisa ${item.quantity}).`,
        type: "low_stock"
      });
    }
  });

  // 2. Analyze top sellers
  const salesMap: Record<string, { qty: number; profit: number }> = {};
  input.salesData.forEach(sale => {
    if (!salesMap[sale.name]) salesMap[sale.name] = { qty: 0, profit: 0 };
    salesMap[sale.name].qty += sale.quantity;
    salesMap[sale.name].profit += sale.profit || 0;
  });

  const topSellingItems = Object.entries(salesMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 3)
    .map(([name, data]) => `${name} (Terjual ${data.qty} pcs)`);

  const slowMovingItems = Object.entries(salesMap)
    .filter(([_, data]) => data.qty === 0)
    .map(([name]) => name);

  const idleAssets = input.assetData
    .filter(a => a.status === 'In Repair' || a.status === 'Dalam Perbaikan')
    .map(a => a.name);

  return {
    lowStockItems,
    topSellingItems,
    slowMovingItems,
    idleAssets,
    profitAnomalies: [],
    overallSummary: (input.salesData && input.salesData.length > 0)
      ? `Aktivitas penjualan toko roti aktif. ${lowStockItems.length > 0 ? `${lowStockItems.length} bahan baku perlu segera dipesan ulang.` : 'Seluruh persediaan bahan baku berada dalam batas aman.'}`
      : `Belum ada data penjualan pada periode ini. ${lowStockItems.length > 0 ? `${lowStockItems.length} bahan baku menipis dan perlu dipesan ulang.` : 'Seluruh persediaan bahan baku berada dalam batas aman.'}`,
    notifications,
  };
}

// 4. Automated Financial Projection
export async function runAutomatedFinancialProjection(input: {
  historicalSales: string;
  inventoryLevels: string;
  menuItems: string;
  historicalExpenses: string;
}) {
  let sales: any[] = [];
  try {
    sales = JSON.parse(input.historicalSales);
  } catch (e) {}

  let expenses: any[] = [];
  try {
    expenses = JSON.parse(input.historicalExpenses);
  } catch (e) {}

  const totalSales = (sales || []).reduce((acc, s) => acc + Number(s.total || s.gross_revenue || s.revenue || 0), 0);
  const totalExpenses = (expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0);

  if (!sales || sales.length === 0 || totalSales === 0) {
    return {
      projectedRevenue: 0,
      projectedProfit: 0,
      confidenceScore: 0,
      revenueTrendAnalysis: "Belum ada data transaksi yang cukup untuk menganalisis tren omzet penjualan.",
      profitMarginAnalysis: "Belum ada data biaya & penjualan untuk menghitung margin laba.",
      topPerformingItems: [],
      recommendations: "Mulai catat transaksi penjualan di Kasir POS untuk mengaktifkan analisis dan proyeksi keuangan otomatis.",
    };
  }

  // Tally item quantities from actual historical sales
  const itemCounts: Record<string, number> = {};
  sales.forEach((s: any) => {
    if (Array.isArray(s.items)) {
      s.items.forEach((item: any) => {
        const name = item.name || 'Produk';
        itemCounts[name] = (itemCounts[name] || 0) + (Number(item.quantity) || 1);
      });
    }
  });

  const topPerformingItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name} (${count} terjual)`);

  const distinctDays = new Set(sales.map(s => s.date).filter(Boolean)).size || 1;
  const avgDailyRevenue = totalSales / distinctDays;
  const projectedRevenue = Math.round(avgDailyRevenue * 30);
  const avgDailyExpense = totalExpenses > 0 ? (totalExpenses / distinctDays) : (avgDailyRevenue * 0.55);
  const projectedExpense = Math.round(avgDailyExpense * 30);
  const projectedProfit = Math.max(0, projectedRevenue - projectedExpense);
  const marginPct = projectedRevenue > 0 ? Math.round((projectedProfit / projectedRevenue) * 100) : 0;
  const confidence = Math.min(0.95, Math.max(0.4, Number((0.4 + (distinctDays / 30) * 0.5).toFixed(2))));

  return {
    projectedRevenue,
    projectedProfit,
    confidenceScore: confidence,
    revenueTrendAnalysis: `Berdasarkan ${sales.length} transaksi dalam ${distinctDays} hari aktif, rata-rata omzet harian adalah Rp ${Math.round(avgDailyRevenue).toLocaleString('id-ID')}.`,
    profitMarginAnalysis: `Estimasi margin laba bersih toko sekitar ${marginPct}% dengan proyeksi laba bulanan sebesar Rp ${projectedProfit.toLocaleString('id-ID')}.`,
    topPerformingItems,
    recommendations: topPerformingItems.length > 0
      ? `Pastikan stok bahan baku untuk ${topPerformingItems.join(', ')} terjaga untuk memaksimalkan margin keuntungan.`
      : "Lakukan pemantauan berkala terhadap stok bahan baku dan arus kas operasional.",
  };
}

export const runDataEntryTool = aiPoweredDataEntry;
export const runFinancialAnomalyAlerts = runGenerateDailyInsights;
