'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Plus, Edit, Trash2, Check, X, Shield, User as UserIcon } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  authProvider: string;
  role: string;
  status: string;
  avatarUrl?: string;
  workflows: Array<{
    id: string;
    name: string;
    icon?: string;
    webhookUrl: string;
  }>;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

interface Workflow {
  id: string;
  name: string;
  icon?: string;
}

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingWorkflowsId, setManagingWorkflowsId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    loadUsers();
    loadWorkflows();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
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

  const handleCreate = async () => {
    try {
      setError(null);

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      await loadUsers();
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setError(null);

      const updateData: any = {};
      if (formData.name) updateData.name = formData.name;
      if (formData.email) updateData.email = formData.email;
      if (formData.password) updateData.password = formData.password;
      if (formData.role) updateData.role = formData.role;
      if (formData.status) updateData.status = formData.status;

      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      await loadUsers();
      setEditingId(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleAssignWorkflow = async (userId: string, workflowId: string) => {
    try {
      setError(null);

      const response = await fetch('/api/admin/user-workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ userId, workflowId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign workflow');
      }

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign workflow');
    }
  };

  const handleUnassignWorkflow = async (userId: string, workflowId: string) => {
    try {
      setError(null);

      const response = await fetch('/api/admin/user-workflows', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ userId, workflowId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove workflow');
      }

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove workflow');
    }
  };

  const startEdit = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role as 'user' | 'admin',
      status: user.status as 'active' | 'inactive',
    });
    setEditingId(user.id);
    setShowCreateForm(false);
    setManagingWorkflowsId(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      status: 'active',
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Users</h2>
          <p className="text-muted-foreground mt-1">Manage users and their workflow permissions</p>
        </div>
        <Button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingId(null);
            setManagingWorkflowsId(null);
            resetForm();
          }}
        >
          <Plus size={20} className="mr-2" />
          New User
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
            <CardDescription>Add a new local user to the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Role</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate}>
                <Check size={20} className="mr-2" />
                Create User
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
              >
                <X size={20} className="mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="pt-6">
              {editingId === user.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">New Password (leave blank to keep current)</label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2"
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })
                        }
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as 'active' | 'inactive',
                          })
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdate(user.id)} size="sm">
                      <Check size={16} className="mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        resetForm();
                      }}
                    >
                      <X size={16} className="mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : managingWorkflowsId === user.id ? (
                <div className="space-y-4">
                  <h4 className="font-semibold">Manage Workflows for {user.name}</h4>

                  <div className="space-y-2">
                    {workflows.map((workflow) => {
                      const isAssigned = user.workflows.some((w) => w.id === workflow.id);

                      return (
                        <div
                          key={workflow.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{workflow.icon || '🌐'}</span>
                            <span className="font-medium">{workflow.name}</span>
                          </div>

                          {isAssigned ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnassignWorkflow(user.id, workflow.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X size={16} className="mr-2" />
                              Remove
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAssignWorkflow(user.id, workflow.id)}
                            >
                              <Check size={16} className="mr-2" />
                              Assign
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Button variant="outline" onClick={() => setManagingWorkflowsId(null)}>
                    Done
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon size={24} className="text-primary" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{user.name}</h3>
                        {user.role === 'admin' && (
                          <Shield size={16} className="text-purple-600" />
                        )}
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {user.authProvider}
                        </span>
                        {user.status === 'inactive' && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>

                      {user.workflows.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {user.workflows.map((w) => (
                            <span
                              key={w.id}
                              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded flex items-center gap-1"
                            >
                              <span>{w.icon || '🌐'}</span>
                              <span>{w.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setManagingWorkflowsId(user.id)}
                    >
                      Workflows
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(user)}>
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(user.id, user.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No users found. Create your first user to get started.</p>
        </div>
      )}
    </div>
  );
}
