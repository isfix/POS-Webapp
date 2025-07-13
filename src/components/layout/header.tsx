'use client';
import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { SIDENAV_ITEMS } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/utils';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    const mainContent = document.querySelector('main > div[class*="overflow-y-auto"]');
    
    const handleScroll = (e: Event) => {
        const target = e.target as HTMLElement;
        setScrolled(target.scrollTop > 10);
    };

    mainContent?.addEventListener('scroll', handleScroll);
    return () => {
      mainContent?.removeEventListener('scroll', handleScroll);
    };
  }, []);


  const handleSignOut = async () => {
    await signOut(auth);
    // The AuthProvider and RequireAuth components will handle redirecting to /login
  };


  const getPageTitle = () => {
    for (const item of SIDENAV_ITEMS) {
      if (item.path === pathname) return item.title;
      if (item.submenu) {
        for (const subItem of item.subMenuItems) {
          if (subItem.path === pathname) return subItem.title;
        }
      }
    }
    // Fallback for pages not in nav or dynamic routes
    const segments = pathname.split('/').filter(Boolean);
    if(segments.length === 0) return "Dashboard";
    return segments[segments.length - 1]
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };


  return (
    <header
      className={cn(
        'sticky z-10 flex h-16 shrink-0 items-center gap-4 px-4 transition-all duration-300 md:px-6',
        scrolled
          ? 'top-0 md:top-2 md:mx-2 md:rounded-lg glass-pane'
          : 'top-0 rounded-t-lg border-b border-transparent'
      )}
    >
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <h1 className="text-lg font-semibold md:text-xl">{getPageTitle()}</h1>
      {user && (
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      )}
    </header>
  );
}
