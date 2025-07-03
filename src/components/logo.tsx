'use client';

import { Coffee } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

export function Logo() {
  const { unseenCount } = useNotifications();

  return (
    <div className="flex items-center gap-2 font-semibold text-lg">
      <div className="relative">
        <div className="bg-primary/20 rounded-lg flex items-center justify-center p-2">
          <Coffee className="h-7 w-7 text-primary" />
        </div>
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </div>
      <span className="group-data-[state=expanded]/sidebar-wrapper:inline hidden">BrewFlow</span>
    </div>
  );
}
