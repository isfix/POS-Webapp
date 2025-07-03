'use client';

import { Header } from '@/components/layout/header';
import dynamic from 'next/dynamic';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useEffect } from 'react';

const MainSidebar = dynamic(() => import('@/components/layout/sidebar').then((mod) => mod.MainSidebar), {
  ssr: false,
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
    const applySavedSettings = () => {
      // Text Color
      const defaultTextColor = '240 10% 20%'; // Default from globals.css
      const savedTextColor = localStorage.getItem('textColorSetting');
      document.documentElement.style.setProperty('--foreground', savedTextColor || defaultTextColor);

      // Background
      const savedBg = localStorage.getItem('backgroundSetting');
      if (savedBg) {
        try {
          const { type, value } = JSON.parse(savedBg);
          
          const colorMap: Record<string, string> = {
            default: '240 67% 97%', dark: '240 4% 15%', ocean: '210 40% 96%',
            sunset: '30 80% 95%', forest: '120 20% 96%', twilight: '270 40% 97%',
            sand: '40 60% 95%', sakura: '340 80% 96%', mint: '150 50% 96%',
            peach: '25 90% 95%', stone: '240 5% 96%', rose: '350 78% 97%',
            sky: '190 80% 96%', slate: '220 13% 18%', olive: '70 20% 95%',
          };

          if (type === 'image' && value) {
            document.documentElement.classList.add('has-image-background');
            document.body.style.backgroundImage = `url('${value}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
          } else {
            document.documentElement.classList.remove('has-image-background');
            document.body.style.backgroundImage = 'none';
            if (type === 'color' && value in colorMap) {
                document.documentElement.style.setProperty('--background', colorMap[value]);
            } else {
                document.documentElement.style.setProperty('--background', colorMap['default']);
            }
          }
        } catch (e) {
            console.error("Failed to parse background settings", e);
             document.documentElement.classList.remove('has-image-background');
             document.body.style.backgroundImage = 'none';
             document.documentElement.style.setProperty('--background', '240 67% 97%');
        }
      }

      // Glass Effects
      const savedGlass = localStorage.getItem('glassEffectSettings');
      if (savedGlass) {
        try {
          const { blur, opacity } = JSON.parse(savedGlass);
          document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
          document.documentElement.style.setProperty('--glass-opacity', opacity);
        } catch(e) {
          console.error("Failed to parse glass settings", e);
          document.documentElement.style.setProperty('--glass-blur', `16px`);
          document.documentElement.style.setProperty('--glass-opacity', '0.4');
        }
      }
    };
    applySavedSettings();
  }, []);

  return (
    <RequireAuth>
        <div className="flex min-h-screen w-full relative isolate">
        <div className="absolute inset-0 bg-black/20 -z-10" />
        <MainSidebar />
        <div className="flex flex-1 flex-col md:p-2 min-w-0">
            <main className="flex flex-1 flex-col rounded-lg glass-pane overflow-hidden">
            <Header />
            <div className="flex-1 p-2 sm:p-4 md:p-6 min-w-0 overflow-y-auto">{children}</div>
            </main>
        </div>
        </div>
    </RequireAuth>
  );
}
