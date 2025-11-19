'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Workflow,
  Users,
  UserCog,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { DashboardTab } from '@/components/admin/DashboardTab';
import { WorkflowsTab } from '@/components/admin/WorkflowsTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { PendingUsersTab } from '@/components/admin/PendingUsersTab';

type TabType = 'dashboard' | 'workflows' | 'users' | 'pending';

export default function AdminPage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Verificar autenticação e permissão de admin
  useEffect(() => {
    checkAuth().then((authenticated) => {
      setIsCheckingAuth(false);

      if (!authenticated) {
        router.push('/login');
        return;
      }

      // Verificar se é admin
      if (user?.role !== 'admin') {
        router.push('/');
        return;
      }
    });
  }, [checkAuth, router, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loading />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return null;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workflows', label: 'Workflows', icon: Workflow },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'pending', label: 'Pending Users', icon: UserCog },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-background flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">{user?.name}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => router.push('/')}
          >
            <ArrowLeft size={20} />
            Back to Chat
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'workflows' && <WorkflowsTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'pending' && <PendingUsersTab />}
        </div>
      </main>
    </div>
  );
}
