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
      // Default colors from globals.css for fallback
      const defaultMainText = '240 10% 20%';
      const defaultMutedText = '240 10% 45%';
      const defaultInvertedText = '0 0% 100%';
      const defaultAccent = '240 10% 40%';
      const defaultBg = '240 67% 97%';

      // Text Colors
      const savedMainText = localStorage.getItem('mainTextColor');
      const savedMutedText = localStorage.getItem('mutedTextColor');
      const savedInvertedText = localStorage.getItem('invertedTextColor');
      
      document.documentElement.style.setProperty('--foreground', savedMainText || defaultMainText);
      document.documentElement.style.setProperty('--muted-foreground', savedMutedText || defaultMutedText);
      document.documentElement.style.setProperty('--primary-foreground', savedInvertedText || defaultInvertedText);
      document.documentElement.style.setProperty('--destructive-foreground', savedInvertedText || defaultInvertedText);

      // Accent Color
      const savedAccentColor = localStorage.getItem('accentColor');
      const accentToApply = savedAccentColor || defaultAccent;
      document.documentElement.style.setProperty('--primary', accentToApply);
      document.documentElement.style.setProperty('--ring', accentToApply);


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
            document.documentElement.style.setProperty('--background', 'transparent');
          } else {
            document.documentElement.classList.remove('has-image-background');
            document.body.style.backgroundImage = 'none';
            if (type === 'color' && value in colorMap) {
                document.documentElement.style.setProperty('--background', colorMap[value]);
            } else {
                document.documentElement.style.setProperty('--background', defaultBg);
            }
          }
        } catch (e) {
            console.error("Failed to parse background settings", e);
             document.documentElement.classList.remove('has-image-background');
             document.body.style.backgroundImage = 'none';
             document.documentElement.style.setProperty('--background', defaultBg);
        }
      }

      // Glass Effects
      const savedGlass = localStorage.getItem('glassEffectSettings');
      if (savedGlass) {
        try {
          const { blur, opacity, shadowBlur, shadowOpacity } = JSON.parse(savedGlass);
          document.documentElement.style.setProperty('--glass-blur', `${blur || 16}px`);
          document.documentElement.style.setProperty('--glass-opacity', opacity || 0.4);
          document.documentElement.style.setProperty('--shadow-blur', `${shadowBlur || 20}px`);
          document.documentElement.style.setProperty('--shadow-opacity', shadowOpacity || 0.1);
        } catch(e) {
          console.error("Failed to parse glass settings", e);
          document.documentElement.style.setProperty('--glass-blur', `16px`);
          document.documentElement.style.setProperty('--glass-opacity', '0.4');
          document.documentElement.style.setProperty('--shadow-blur', '20px');
          document.documentElement.style.setProperty('--shadow-opacity', '0.1');
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
