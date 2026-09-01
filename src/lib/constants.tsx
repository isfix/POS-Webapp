import {
  LayoutDashboard,
  Database,
  Bot,
  Settings,
  Coins,
  CalendarCheck,
  BarChart3,
  BookText,
  ShoppingCart,
  PackageSearch,
  TrendingUp,
  Archive,
  ClipboardList,
  LineChart,
  ReceiptText,
} from 'lucide-react';

const iconSize = 18;

export const SIDENAV_ITEMS = [
  {
    title: 'Dasbor',
    path: '/dashboard',
    icon: <LayoutDashboard size={iconSize} />,
  },
  {
    title: 'Kasir (POS)',
    path: '/pos',
    icon: <ShoppingCart size={iconSize} />,
  },
  {
    title: 'Laporan',
    path: '/reports',
    icon: <ClipboardList size={iconSize} />,
    submenu: true,
    subMenuItems: [
      { title: 'Tutup Harian', path: '/reports/end-of-day', icon: <CalendarCheck size={iconSize} /> },
      { title: 'Tutup Bulanan', path: '/reports/end-of-month', icon: <BarChart3 size={iconSize} /> },
      { title: 'Penjualan Harian', path: '/reports/daily-sales', icon: <Coins size={iconSize} /> },
      { title: 'Laporan Keuangan', path: '/reports/financial-statements', icon: <BookText size={iconSize} /> },
    ],
  },
  {
    title: 'Keuangan',
    path: '/financials',
    icon: <TrendingUp size={iconSize} />,
    submenu: true,
    subMenuItems: [
      { title: 'Proyeksi Keuangan', path: '/financials/projections', icon: <LineChart size={iconSize} /> },
      { title: 'Beban & Pengeluaran', path: '/expenses', icon: <ReceiptText size={iconSize} /> },
    ],
  },
  {
    title: 'Stok Bahan & Barang',
    path: '/inventory',
    icon: <PackageSearch size={iconSize} />,
  },
  {
    title: 'Aset & Peralatan Toko',
    path: '/assets',
    icon: <Archive size={iconSize} />,
  },
  {
    title: 'Katalog Menu & Produk',
    path: '/data',
    icon: <Database size={iconSize} />,
  },
  {
    title: 'Asisten AI Bakery',
    path: '/ai-tools',
    icon: <Bot size={iconSize} />,
  },
];

export const SIDENAV_FOOTER_ITEMS = [
  {
    title: 'Pengaturan',
    path: '/settings',
    icon: <Settings size={iconSize} />,
  },
];
