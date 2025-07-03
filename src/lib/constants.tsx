
import {
  LayoutDashboard,
  Database,
  Cpu,
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

const iconSize = 16;

export const SIDENAV_ITEMS = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={iconSize} />,
  },
   {
    title: 'Point of Sale',
    path: '/pos',
    icon: <ShoppingCart size={iconSize} />,
  },
  {
    title: 'Reports',
    path: '/reports',
    icon: <ClipboardList size={iconSize} />,
    submenu: true,
    subMenuItems: [
      { title: 'End of Day', path: '/reports/end-of-day', icon: <CalendarCheck size={iconSize} /> },
      { title: 'End of Month', path: '/reports/end-of-month', icon: <BarChart3 size={iconSize} /> },
      { title: 'Daily Sales', path: '/reports/daily-sales', icon: <Coins size={iconSize} /> },
      { title: 'Financial Statements', path: '/reports/financial-statements', icon: <BookText size={iconSize} /> },
    ],
  },
  {
    title: 'Financials',
    path: '/financials',
    icon: <TrendingUp size={iconSize} />,
    submenu: true,
    subMenuItems: [
      { title: 'Projections', path: '/financials/projections', icon: <LineChart size={iconSize} /> },
      { title: 'Expenses', path: '/expenses', icon: <ReceiptText size={iconSize} /> },
    ],
  },
  {
    title: 'Inventory',
    path: '/inventory',
    icon: <PackageSearch size={iconSize} />,
  },
  {
    title: 'Asset Management',
    path: '/assets',
    icon: <Archive size={iconSize} />,
  },
  {
    title: 'Data Management',
    path: '/data',
    icon: <Database size={iconSize} />,
  },
  {
    title: 'AI Tools',
    path: '/ai-tools',
    icon: <Cpu size={iconSize} />,
  },
];

export const SIDENAV_FOOTER_ITEMS = [
    {
        title: 'Settings',
        path: '/settings',
        icon: <Settings size={iconSize} />,
    }
]
