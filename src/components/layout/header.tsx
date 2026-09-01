'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Sparkles } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

const TITLE_MAP: Record<string, string> = {
  'dashboard': 'Dasbor Utama',
  'pos': 'Kasir Penjualan (POS)',
  'inventory': 'Stok Bahan & Gudang',
  'data': 'Katalog Menu & HPP',
  'assets': 'Aset & Peralatan',
  'daily-sales': 'Laporan Penjualan Harian',
  'end-of-day': 'Rekap Tutup Kasir (EOD)',
  'end-of-month': 'Rekapitulasi Bulanan',
  'financial-statements': 'Laporan Laba Rugi (P&L)',
  'expenses': 'Beban & Biaya Operasional',
  'projections': 'Proyeksi Keuangan 30 Hari',
  'ai-tools': 'Asisten AI',
  'settings': 'Pengaturan Sistem',
};

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return TITLE_MAP['dashboard'];
    const lastSegment = segments[segments.length - 1];
    return TITLE_MAP[lastSegment] || lastSegment.replace(/-/g, ' ');
  };

  const title = getPageTitle();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 px-4 bg-background border-b border-border">
      <div className="flex items-center gap-2.5">
        <SidebarTrigger className="h-8 w-8 text-foreground" />
        <Separator orientation="vertical" className="h-4 mr-1" />
        <h1 className="text-sm font-semibold text-foreground tracking-tight">
          {title}
        </h1>
      </div>

      {user && (
        <div className="flex items-center gap-2">
          <Link href="/ai-tools">
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 h-8 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Asisten AI
            </Button>
          </Link>
          <NotificationBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive h-8 text-xs font-medium px-2.5"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      )}
    </header>
  );
}
