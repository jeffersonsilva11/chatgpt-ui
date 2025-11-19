'use client';

import { useChatStore } from '@/lib/store';
import { useAuthStore } from '@/lib/store/auth';
import { useRouter } from 'next/navigation';
import { Sun, Moon, User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export function Header() {
  const router = useRouter();
  const { settings, updateSettings } = useChatStore();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleTheme = () => {
    updateSettings({
      theme: settings.theme === 'light' ? 'dark' : 'light',
    });
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
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

          {/* User Menu */}
          {user && (
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-primary" />
                  )}
                </div>
                <span className="text-sm font-medium hidden md:block">{user.name}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    'transition-transform hidden md:block',
                    showUserMenu && 'rotate-180'
                  )}
                />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-background border rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Role: <span className="capitalize">{user.role}</span>
                      </p>
                    </div>
                    <div className="p-2">
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
