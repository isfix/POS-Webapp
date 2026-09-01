'use client';

import { Header } from '@/components/layout/header';
import { MainSidebar } from '@/components/layout/sidebar';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <SidebarProvider defaultOpen={true}>
        <MainSidebar />
        <SidebarInset className="flex flex-col min-h-screen bg-background min-w-0">
          <Header />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RequireAuth>
  );
}
