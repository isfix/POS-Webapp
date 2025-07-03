'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  useSidebar,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SIDENAV_ITEMS } from '@/lib/constants';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export function MainSidebar() {
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { state: sidebarState, isMobile, openMobile, setOpenMobile } = useSidebar();

  const toggleSubmenu = (path: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };
  
  const content = (
    <>
      <SidebarHeader />
      <SidebarContent className="flex flex-col pt-0">
        <SidebarMenu>
          {SIDENAV_ITEMS.map((item) =>
            item.submenu ? (
              <SidebarMenuItem key={item.path}>
                {sidebarState === 'collapsed' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        isActive={pathname.startsWith(item.path)}
                        tooltip={item.title}
                        className="justify-center"
                      >
                        {item.icon}
                        <span className="sr-only">{item.title}</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="start"
                      sideOffset={10}
                    >
                      {item.subMenuItems.map((subItem) => (
                        <DropdownMenuItem key={subItem.path} asChild>
                          <Link href={subItem.path} className="flex items-center gap-2 cursor-pointer">
                            {subItem.icon}
                            <span>{subItem.title}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <SidebarMenuButton
                      onClick={() => toggleSubmenu(item.path)}
                      isActive={pathname.startsWith(item.path)}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.title}</span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          openSubmenus[item.path] ? 'rotate-180' : ''
                        }`}
                      />
                    </SidebarMenuButton>
                    {openSubmenus[item.path] && (
                      <SidebarMenuSub>
                        {item.subMenuItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.path}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.path}
                            >
                              <Link href={subItem.path}>
                                {subItem.icon}
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </>
                )}
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.path}
                  tooltip={item.title}
                >
                  <Link href={item.path}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <SidebarMenuButton
            asChild
            isActive={pathname === '/settings'}
            tooltip="Settings"
          >
            <Link href="/settings">
              <Settings />
              <span>Settings</span>
            </Link>
          </SidebarMenuButton>
          <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
            <LogOut />
            <span>Sign Out</span>
          </SidebarMenuButton>
        </SidebarFooter>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-72 bg-card/40 backdrop-blur-2xl p-0 text-sidebar-foreground border-r-0 flex flex-col"
        >
          <SheetTitle className="sr-only">Main Menu</SheetTitle>
          <SheetDescription className="sr-only">
            The main navigation menu for the application.
          </SheetDescription>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className="border-r-0"
    >
      <div
        data-sidebar="sidebar"
        className="flex h-full flex-col bg-card/40 backdrop-blur-2xl overflow-hidden group-data-[variant=floating]:rounded-lg"
      >
        {content}
      </div>
    </Sidebar>
  );
}
