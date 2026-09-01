// src/lib/mock-data.ts
import { subDays, format } from 'date-fns';

export const INITIAL_MENU_ITEMS = [
  {
    id: 'menu-1',
    name: 'Roti Sisir Mentega Spesial',
    category: 'Roti Manis',
    price: 12000,
    costPrice: 5500,
    availability: true,
    description: 'Roti sisir lembut klasik dengan olesan mentega Wijsman gurih manis.',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-2',
    name: 'Roti Cokelat Keju Lumer',
    category: 'Roti Manis',
    price: 14000,
    costPrice: 6000,
    availability: true,
    description: 'Perpaduan cokelat pasta premium dan potongan keju cheddar gurih.',
    imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-3',
    name: 'Roti Sobek Cokelat Klasik',
    category: 'Roti Manis',
    price: 24000,
    costPrice: 10000,
    availability: true,
    description: 'Roti sobek porsi keluarga dengan isian cokelat melimpah.',
    imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-4',
    name: 'Roti Tawar Susu Premium',
    category: 'Roti Tawar',
    price: 18000,
    costPrice: 8500,
    availability: true,
    description: 'Roti tawar ekstra lembut dengan aroma susu murni.',
    imageUrl: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-5',
    name: 'Roti Tawar Gandum Utuh (Whole Wheat)',
    category: 'Roti Tawar',
    price: 22000,
    costPrice: 11000,
    availability: true,
    description: 'Kaya serat gandum utuh, cocok untuk sarapan sehat dan diet.',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-6',
    name: 'Croissant Butter Perancis',
    category: 'Pastry & Croissant',
    price: 20000,
    costPrice: 9000,
    availability: true,
    description: 'Pastry renyah berlapis dengan mentega impor berkualitas tinggi.',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-7',
    name: 'Pain au Chocolat (Croissant Cokelat)',
    category: 'Pastry & Croissant',
    price: 24000,
    costPrice: 10500,
    availability: true,
    description: 'Croissant khas Perancis berisi dark chocolate batangan meleleh.',
    imageUrl: 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-8',
    name: 'Strawberry Shortcake Slice',
    category: 'Cake & Tart',
    price: 32000,
    costPrice: 15000,
    availability: true,
    description: 'Sponge cake vanilla lembut dengan krim segar dan stroberi segar.',
    imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-9',
    name: 'Black Forest Tart Mini',
    category: 'Cake & Tart',
    price: 35000,
    costPrice: 16000,
    availability: true,
    description: 'Cake cokelat pekat dengan selai dark cherry dan serutan cokelat.',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-10',
    name: 'Donat Kampung Gula Halus (Isi 4)',
    category: 'Donat & Cookies',
    price: 20000,
    costPrice: 8000,
    availability: true,
    description: 'Donat kentang empuk tradisional bertabur gula dingin salju.',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-11',
    name: 'Choco Chip Cookies Box (200g)',
    category: 'Donat & Cookies',
    price: 28000,
    costPrice: 12000,
    availability: true,
    description: 'Kue kering renyah dengan lelehan butir cokelat Belgia.',
    imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'menu-12',
    name: 'Kopi Susu Gula Aren Bakery',
    category: 'Minuman',
    price: 18000,
    costPrice: 7000,
    availability: true,
    description: 'Espresso arabika fresh milk dengan gula aren organik.',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=400&q=80',
  },
];

export const INITIAL_INVENTORY = [
  {
    id: 'inv-1',
    name: 'Tepung Terigu Cakra Kembar (Protein Tinggi)',
    category: 'Tepung & Ragi',
    quantity: 120,
    minThreshold: 30,
    unitType: 'kg',
    costPerUnit: 14500,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'inv-2',
    name: 'Mentega Butter Wijsman Kaleng',
    category: 'Dairy, Mentega & Telur',
    quantity: 18,
    minThreshold: 5,
    unitType: 'kaleng',
    costPerUnit: 125000,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'inv-3',
    name: 'Ragi Instant Saf-Instant Merah',
    category: 'Tepung & Ragi',
    quantity: 4, // Low stock on purpose
    minThreshold: 10,
    unitType: 'sachet 500g',
    costPerUnit: 48000,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'inv-4',
    name: 'Gula Pasir Kristal Putih',
    category: 'Gula & Pemanis',
    quantity: 65,
    minThreshold: 20,
    unitType: 'kg',
    costPerUnit: 17500,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'inv-5',
    name: 'Susu Cair UHT Full Cream',
    category: 'Dairy, Mentega & Telur',
    quantity: 35,
    minThreshold: 15,
    unitType: 'liter',
    costPerUnit: 19000,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'inv-6',
    name: 'Cokelat Pasta & Meses Tulip',
    category: 'Isian & Topping',
    quantity: 22,
    minThreshold: 8,
    unitType: 'kg',
    costPerUnit: 68000,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'inv-7',
    name: 'Keju Cheddar Kraft Block',
    category: 'Isian & Topping',
    quantity: 3, // Low stock on purpose
    minThreshold: 8,
    unitType: 'blok 2kg',
    costPerUnit: 145000,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'inv-8',
    name: 'Dus Kemasan Sablon Standar',
    category: 'Kemasan & Dus Roti',
    quantity: 380,
    minThreshold: 100,
    unitType: 'pcs',
    costPerUnit: 1800,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'inv-9',
    name: 'Plastik Seal Roti OPP Bening',
    category: 'Kemasan & Dus Roti',
    quantity: 750,
    minThreshold: 200,
    unitType: 'pcs',
    costPerUnit: 350,
    lastUpdated: new Date().toISOString(),
  },
];

export const INITIAL_EXPENSES = [
  {
    id: 'exp-1',
    category: 'Operasional & Utilitas (Listrik/Gas Oven)',
    amount: 1850000,
    description: 'Pembelian Gas LPG 12kg (4 tabung) & Token Listrik Oven Toko',
    date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
  },
  {
    id: 'exp-2',
    category: 'Kemasan & Dus Roti',
    amount: 900000,
    description: 'Cetak 500 Dus Kemasan Roti Sablon Custom',
    date: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
  },
  {
    id: 'exp-3',
    category: 'Gaji & Upah Karyawan',
    amount: 6500000,
    description: 'Gaji Bulanan Staf Baker Utama & Staf Kasir',
    date: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
  },
  {
    id: 'exp-4',
    category: 'Perawatan Mesin & Oven',
    amount: 350000,
    description: 'Pelumasan berkala gear Spiral Mixer 20L & pembersihan burner oven',
    date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
  },
];

export const INITIAL_ASSETS = [
  {
    id: 'ast-1',
    name: 'Deck Oven Gas 2 Deck 4 Tray Sinmag',
    category: 'Oven & Pemanggang',
    status: 'Aktif',
    purchaseDate: '2024-01-15',
    cost: 18500000,
    notes: 'Pemanggang utama kapasitas 4 loyang 40x60 cm. Suhu stabil.',
  },
  {
    id: 'ast-2',
    name: 'Spiral Dough Mixer 20 Liter Sinmag',
    category: 'Mixer & Pengaduk Adonan',
    status: 'Aktif',
    purchaseDate: '2024-02-10',
    cost: 12500000,
    notes: 'Kapasitas adonan basah 8kg tepung. Servis rutin setiap 3 bulan.',
  },
  {
    id: 'ast-3',
    name: 'Proofer Adonan Roti 16 Tray Pengatur Kelembaban',
    category: 'Peralatan Loyang & Dapur',
    status: 'Aktif',
    purchaseDate: '2024-02-15',
    cost: 7800000,
    notes: 'Pengembang adonan otomatis dengan kontrol timer dan uap.',
  },
  {
    id: 'ast-4',
    name: 'Showcase Etalase Display Roti Curve Kaca LED',
    category: 'Showcase & Etalase Kaca',
    status: 'Aktif',
    purchaseDate: '2024-03-01',
    cost: 9500000,
    notes: 'Etalase display kaca lengkung depan kasir dengan lampu LED hangat.',
  },
  {
    id: 'ast-5',
    name: 'Terminal POS Touchscreen Kasir & Printer Thermal 80mm',
    category: 'Elektronik Kasir & POS',
    status: 'Aktif',
    purchaseDate: '2024-03-10',
    cost: 4500000,
    notes: 'Unit kasir kasir meja utama dengan laci kas otomatis.',
  },
];

export const INITIAL_LOGS = [
  {
    id: 'log-1',
    user_name: 'Staf Kasir',
    action: 'Membuka sesi kasir dan mencatat transaksi awal',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'log-2',
    user_name: 'Admin Toko',
    action: 'Memeriksa dan memperbarui stok Tepung Terigu Cakra Kembar',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'log-3',
    user_name: 'Manager Bakery',
    action: 'Memverifikasi resep dan HPP Roti Sisir Mentega Spesial',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Generate realistic mock orders for the last 7 days (canonical snake_case shape)
export const generateMockOrders = () => {
  const orders: any[] = [];
  const now = new Date();

  const sampleCustomers = ['Pelanggan Langganan', 'Bpk. Hendra', 'Ibu Rina', 'Walk-in Customer', 'Pesanan Kantor', 'Ibu Maya', 'Bpk. Dimas'];
  const paymentMethods = ['Tunai', 'QRIS'];

  for (let i = 0; i < 7; i++) {
    const orderDate = subDays(now, i);
    const dayOrdersCount = 4 + Math.floor(Math.random() * 5); // 4-8 orders per day

    for (let j = 0; j < dayOrdersCount; j++) {
      const randomItemsCount = 1 + Math.floor(Math.random() * 3);
      const items: any[] = [];
      let totalAmount = 0;
      let totalCost = 0;

      for (let k = 0; k < randomItemsCount; k++) {
        const randomItem = INITIAL_MENU_ITEMS[Math.floor(Math.random() * INITIAL_MENU_ITEMS.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        const itemPrice = randomItem.price * qty;
        const itemCost = randomItem.costPrice * qty;

        items.push({
          id: randomItem.id,
          name: randomItem.name,
          price: randomItem.price,
          cost_price: randomItem.costPrice,
          quantity: qty,
          category: randomItem.category,
        });

        totalAmount += itemPrice;
        totalCost += itemCost;
      }

      const totalProfit = totalAmount - totalCost;
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const cashGiven = paymentMethod === 'Tunai' ? (Math.ceil(totalAmount / 50000) * 50000 || totalAmount) : totalAmount;

      orders.push({
        id: `ord-${i}-${j}-${Date.now()}`,
        items,
        total: totalAmount,
        gross_revenue: totalAmount,
        total_cost: totalCost,
        total_profit: totalProfit,
        payment_method: paymentMethod,
        cash_given: cashGiven,
        change_due: Math.max(0, cashGiven - totalAmount),
        customer_name: sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)],
        status: 'Completed',
        created_at: orderDate.toISOString(),
      });
    }
  }

  return orders;
};

// Helper to initialize local storage
export const ensureMockDataInitialized = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('rotikita_menu')) {
    localStorage.setItem('rotikita_menu', JSON.stringify(INITIAL_MENU_ITEMS));
  }
  if (!localStorage.getItem('rotikita_inventory')) {
    localStorage.setItem('rotikita_inventory', JSON.stringify(INITIAL_INVENTORY));
  }
  if (!localStorage.getItem('rotikita_expenses')) {
    localStorage.setItem('rotikita_expenses', JSON.stringify(INITIAL_EXPENSES));
  }
  if (!localStorage.getItem('rotikita_assets')) {
    localStorage.setItem('rotikita_assets', JSON.stringify(INITIAL_ASSETS));
  }
  if (!localStorage.getItem('rotikita_orders')) {
    localStorage.setItem('rotikita_orders', JSON.stringify(generateMockOrders()));
  }
  if (!localStorage.getItem('rotikita_logs')) {
    localStorage.setItem('rotikita_logs', JSON.stringify(INITIAL_LOGS));
  }
};
