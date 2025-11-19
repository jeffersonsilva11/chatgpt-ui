'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  webhookUrl: string;
  description?: string;
  icon?: string;
  isMaster: boolean;
  allowedDepartments: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function WorkflowsTab() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    webhookUrl: '',
    description: '',
    icon: '',
    isMaster: false,
    isActive: true,
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/workflows', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load workflows');
      }

      const data = await response.json();
      setWorkflows(data.workflows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);

      const response = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          ...formData,
          allowedDepartments: [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workflow');
      }

      setWorkflows([data.workflow, ...workflows]);
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/admin/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update workflow');
      }

      setWorkflows(workflows.map((w) => (w.id === id ? data.workflow : w)));
      setEditingId(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete workflow "${name}"?`)) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/admin/workflows/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete workflow');
      }

      setWorkflows(workflows.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
    }
  };

  const startEdit = (workflow: Workflow) => {
    setFormData({
      id: workflow.id,
      name: workflow.name,
      webhookUrl: workflow.webhookUrl,
      description: workflow.description || '',
      icon: workflow.icon || '',
      isMaster: workflow.isMaster,
      isActive: workflow.isActive,
    });
    setEditingId(workflow.id);
    setShowCreateForm(false);
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      webhookUrl: '',
      description: '',
      icon: '',
      isMaster: false,
      isActive: true,
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
          <h2 className="text-3xl font-bold">Workflows</h2>
          <p className="text-muted-foreground mt-1">Manage workflows and their configurations</p>
        </div>
        <Button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingId(null);
            resetForm();
          }}
        >
          <Plus size={20} className="mr-2" />
          New Workflow
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
            <CardTitle>Create New Workflow</CardTitle>
            <CardDescription>Add a new workflow to the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Workflow ID</label>
                <Input
                  placeholder="e.g., rh, ti, financeiro"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase() })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g., RH, TI, Financeiro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Webhook URL</label>
              <Input
                placeholder="https://n8n.example.com/webhook/..."
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Workflow description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Icon (emoji)</label>
                <Input
                  placeholder="e.g., 👥, 💻, 💰"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isMaster}
                    onChange={(e) => setFormData({ ...formData, isMaster: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Master Workflow</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate}>
                <Check size={20} className="mr-2" />
                Create Workflow
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

      {/* Workflows List */}
      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardContent className="pt-6">
              {editingId === workflow.id ? (
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
                      <label className="text-sm font-medium">Icon</label>
                      <Input
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Webhook URL</label>
                    <Input
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Active</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdate(workflow.id)} size="sm">
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
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{workflow.icon || '🌐'}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{workflow.name}</h3>
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {workflow.id}
                        </span>
                        {workflow.isMaster && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            Master
                          </span>
                        )}
                        {!workflow.isActive && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {workflow.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        {workflow.webhookUrl}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(workflow)}>
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(workflow.id, workflow.name)}
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

      {workflows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No workflows found. Create your first workflow to get started.</p>
        </div>
      )}
    </div>
  );
}
