'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  PackageSearch,
  Database,
  Archive,
  ReceiptText,
  TrendingUp,
  Coins,
  CalendarCheck,
  BarChart3,
  BookText,
  Bot,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

type NavSection = {
  label: string;
  items: {
    title: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operasional',
    items: [
      { title: 'Dasbor Utama', path: '/dashboard', icon: LayoutDashboard },
      { title: 'Kasir (POS)', path: '/pos', icon: ShoppingCart, badge: 'Live' },
    ],
  },
  {
    label: 'Katalog & Stok',
    items: [
      { title: 'Stok Bahan Baku', path: '/inventory', icon: PackageSearch },
      { title: 'Katalog Menu & HPP', path: '/data', icon: Database },
      { title: 'Aset Mesin & Alat', path: '/assets', icon: Archive },
    ],
  },
  {
    label: 'Laporan & Keuangan',
    items: [
      { title: 'Penjualan Harian', path: '/reports/daily-sales', icon: Coins },
      { title: 'Tutup Kasir (EOD)', path: '/reports/end-of-day', icon: CalendarCheck },
      { title: 'Rekap Bulanan', path: '/reports/end-of-month', icon: BarChart3 },
      { title: 'Laba Rugi (P&L)', path: '/reports/financial-statements', icon: BookText },
      { title: 'Beban Operasional', path: '/expenses', icon: ReceiptText },
      { title: 'Proyeksi Keuangan', path: '/financials/projections', icon: TrendingUp },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { title: 'Asisten AI', path: '/ai-tools', icon: Bot },
      { title: 'Pengaturan', path: '/settings', icon: Settings },
    ],
  },
];

export function MainSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      {/* Clean Minimal Header without branding logo */}
      <SidebarHeader className="h-14 flex items-center justify-center px-3 border-b border-border">
        <Link href="/dashboard" className={`flex items-center gap-2 w-full overflow-hidden ${isCollapsed ? 'justify-center' : 'px-1'}`}>
          {!isCollapsed ? (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight leading-none">Point of Sale</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Sistem Manajemen</span>
            </div>
          ) : (
            <span className="text-xs font-black text-primary">POS</span>
          )}
        </Link>
      </SidebarHeader>

      {/* Main Navigation Sections */}
      <SidebarContent className="px-2 py-2">
        {NAV_SECTIONS.map((section) => (
          <SidebarGroup key={section.label} className="py-1 px-0">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));

                  return (
                    <SidebarMenuItem key={item.path} className="flex justify-center">
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`h-9 px-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <Link href={item.path} className="flex items-center gap-2.5 w-full">
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-sidebar-foreground/70'}`} />
                          <span className="truncate flex-1">{item.title}</span>
                          {item.badge && !isCollapsed && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* User Footer Profile */}
      <SidebarFooter className="border-t border-border p-2">
        {isCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Keluar"
            className="h-9 w-9 text-muted-foreground hover:text-destructive mx-auto"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-sidebar-accent/40 border border-sidebar-border">
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar className="h-7 w-7 shrink-0 border border-border">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {user?.email ? user.email.slice(0, 2).toUpperCase() : 'US'}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden leading-tight">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">
                  {user?.displayName || user?.email?.split('@')[0] || 'Pengguna'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.email || 'user@pos.local'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              onClick={logout}
              title="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
