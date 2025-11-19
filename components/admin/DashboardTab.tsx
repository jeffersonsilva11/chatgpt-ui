'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Users, Workflow, UserCheck, UserX, Activity, TrendingUp } from 'lucide-react';

interface Stats {
  users: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
  };
  workflows: {
    total: number;
    active: number;
    inactive: number;
  };
  activity: {
    logins: number;
    creations: number;
    updates: number;
    deletions: number;
  };
  workflowUsage: Array<{
    id: string;
    name: string;
    icon?: string;
    userCount: number;
  }>;
  authProviders: Array<{
    provider: string;
    count: number;
  }>;
}

export function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.total,
      description: `${stats.users.active} active, ${stats.users.inactive} inactive`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Pending Users',
      value: stats.users.pending,
      description: 'Awaiting approval',
      icon: UserCheck,
      color: 'text-yellow-600',
    },
    {
      title: 'Total Workflows',
      value: stats.workflows.total,
      description: `${stats.workflows.active} active, ${stats.workflows.inactive} inactive`,
      icon: Workflow,
      color: 'text-green-600',
    },
    {
      title: 'Activity (7 days)',
      value: stats.activity.logins,
      description: 'User logins',
      icon: Activity,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground mt-1">System overview and statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity (Last 7 Days)</CardTitle>
          <CardDescription>System actions performed by users and admins</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.activity.logins}</div>
              <div className="text-sm text-muted-foreground">Logins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.activity.creations}</div>
              <div className="text-sm text-muted-foreground">Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.activity.updates}</div>
              <div className="text-sm text-muted-foreground">Updated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.activity.deletions}</div>
              <div className="text-sm text-muted-foreground">Deleted</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Usage</CardTitle>
          <CardDescription>Number of users per workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.workflowUsage.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{workflow.icon || '🌐'}</span>
                  <span className="font-medium">{workflow.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">{workflow.userCount} users</div>
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          (workflow.userCount / stats.users.total) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Auth Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Providers</CardTitle>
          <CardDescription>User distribution by authentication method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.authProviders.map((provider) => (
              <div key={provider.provider} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {provider.provider === 'local' && '🔑'}
                    {provider.provider === 'google' && '🔵'}
                    {provider.provider === 'microsoft' && '🟦'}
                    {provider.provider === 'ad' && '🏢'}
                  </div>
                  <span className="font-medium capitalize">{provider.provider}</span>
                </div>
                <div className="text-sm text-muted-foreground">{provider.count} users</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
