'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Check, X, UserCheck, Clock } from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  name: string;
  authProvider: string;
  providerUserId?: string;
  avatarUrl?: string;
  status: string;
  createdAt: string;
}

interface Workflow {
  id: string;
  name: string;
  icon?: string;
  isActive: boolean;
}

export function PendingUsersTab() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedWorkflows, setSelectedWorkflows] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadPendingUsers();
    loadWorkflows();
  }, []);

  const loadPendingUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/pending-users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load pending users');
      }

      const data = await response.json();
      setPendingUsers(data.pendingUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/admin/workflows', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load workflows');
      }

      const data = await response.json();
      setWorkflows(data.workflows.filter((w: any) => w.isActive));
    } catch (err) {
      console.error('Failed to load workflows:', err);
    }
  };

  const handleApprove = async (userId: string) => {
    const workflowIds = selectedWorkflows[userId] || [];

    if (workflowIds.length === 0) {
      setError('Please select at least one workflow to approve the user');
      return;
    }

    try {
      setProcessingId(userId);
      setError(null);

      const response = await fetch(`/api/admin/pending-users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ workflowIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve user');
      }

      setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
      setSelectedWorkflows((prev) => {
        const { [userId]: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reject "${userName}"?`)) {
      return;
    }

    try {
      setProcessingId(userId);
      setError(null);

      const response = await fetch(`/api/admin/pending-users/${userId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject user');
      }

      setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
      setSelectedWorkflows((prev) => {
        const { [userId]: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject user');
    } finally {
      setProcessingId(null);
    }
  };

  const toggleWorkflow = (userId: string, workflowId: string) => {
    setSelectedWorkflows((prev) => {
      const current = prev[userId] || [];
      const updated = current.includes(workflowId)
        ? current.filter((id) => id !== workflowId)
        : [...current, workflowId];

      return {
        ...prev,
        [userId]: updated,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Pending Users</h2>
        <p className="text-muted-foreground mt-1">
          Review and approve users who signed up via SSO
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <UserCheck size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No pending users</p>
              <p className="text-sm mt-1">All SSO users have been reviewed</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Clock size={24} className="text-yellow-600" />
                      )}
                    </div>

                    <div>
                      <CardTitle>{user.name}</CardTitle>
                      <CardDescription className="mt-1">{user.email}</CardDescription>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                          {user.authProvider}
                        </span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Pending Approval
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested: {new Date(user.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Select Workflows to Grant Access:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {workflows.map((workflow) => {
                      const isSelected =
                        selectedWorkflows[user.id]?.includes(workflow.id) || false;

                      return (
                        <button
                          key={workflow.id}
                          onClick={() => toggleWorkflow(user.id, workflow.id)}
                          className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <span className="text-2xl">{workflow.icon || '🌐'}</span>
                          <span className="font-medium text-sm">{workflow.name}</span>
                          {isSelected && <Check size={16} className="ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleApprove(user.id)}
                    disabled={
                      processingId === user.id ||
                      !selectedWorkflows[user.id] ||
                      selectedWorkflows[user.id].length === 0
                    }
                    className="flex-1"
                  >
                    <Check size={20} className="mr-2" />
                    {processingId === user.id ? 'Approving...' : 'Approve User'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(user.id, user.name)}
                    disabled={processingId === user.id}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <X size={20} className="mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
