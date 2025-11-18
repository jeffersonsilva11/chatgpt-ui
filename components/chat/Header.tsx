'use client';

import { useChatStore } from '@/lib/store';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export function Header() {
  const { settings, updateSettings } = useChatStore();

  const toggleTheme = () => {
    updateSettings({
      theme: settings.theme === 'light' ? 'dark' : 'light',
    });
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {settings.branding.logo && (
            <Image
              src={settings.branding.logo}
              alt="Logo"
              width={32}
              height={32}
              className="rounded"
              unoptimized={settings.branding.logo.startsWith('data:')}
            />
          )}
          <h1 className="text-xl font-bold">{settings.branding.companyName}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </Button>
        </div>
      </div>
    </header>
  );
}
