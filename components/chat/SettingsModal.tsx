'use client';

import { useState, useRef } from 'react';
import { useChatStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AIProvider } from '@/lib/types';
import { Trash2, Upload } from 'lucide-react';
import { fileToDataURL } from '@/lib/utils/file';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { settings, updateSettings, clearAllConversations } = useChatStore();

  const [companyName, setCompanyName] = useState(settings.branding.companyName);
  const [logo, setLogo] = useState(settings.branding.logo);
  const [primaryColor, setPrimaryColor] = useState(settings.branding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(settings.branding.secondaryColor);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(
    settings.fontSize
  );

  const [provider, setProvider] = useState<AIProvider>(settings.provider.type);
  const [n8nUrl, setN8nUrl] = useState(settings.provider.n8n?.webhookUrl || '');
  const [n8nHeaders, setN8nHeaders] = useState(
    JSON.stringify(settings.provider.n8n?.headers || {}, null, 2)
  );
  const [openaiKey, setOpenaiKey] = useState(settings.provider.openai?.apiKey || '');
  const [openaiModel, setOpenaiModel] = useState(
    settings.provider.openai?.model || 'gpt-4-turbo-preview'
  );
  const [geminiKey, setGeminiKey] = useState(settings.provider.gemini?.apiKey || '');
  const [geminiModel, setGeminiModel] = useState(
    settings.provider.gemini?.model || 'gemini-pro'
  );
  const [grokKey, setGrokKey] = useState(settings.provider.grok?.apiKey || '');

  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be less than 2MB');
      return;
    }

    const dataUrl = await fileToDataURL(file);
    setLogo(dataUrl);
  };

  const handleSave = () => {
    let headers = {};
    try {
      headers = JSON.parse(n8nHeaders);
    } catch {
      alert('Invalid JSON for N8N headers');
      return;
    }

    updateSettings({
      branding: {
        companyName,
        logo,
        primaryColor,
        secondaryColor,
        backgroundColor: settings.branding.backgroundColor,
        textColor: settings.branding.textColor,
      },
      fontSize,
      provider: {
        type: provider,
        n8n: {
          webhookUrl: n8nUrl,
          headers,
          timeout: 30000,
        },
        openai: {
          apiKey: openaiKey,
          model: openaiModel,
        },
        gemini: {
          apiKey: geminiKey,
          model: geminiModel,
        },
        grok: {
          apiKey: grokKey,
        },
      },
    });

    onOpenChange(false);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      clearAllConversations();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your AI chat experience and configure providers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Branding Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Branding</h3>

            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="My Company"
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logo && (
                  <img
                    src={logo}
                    alt="Logo preview"
                    className="h-16 w-16 rounded object-cover"
                  />
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload size={16} className="mr-2" />
                  Upload Logo
                </Button>
                {logo && (
                  <Button variant="outline" onClick={() => setLogo(undefined)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-color">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary-color"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#60a5fa"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Provider Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">AI Provider</h3>

            <div className="space-y-2">
              <Label>Select Provider</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['n8n', 'openai', 'gemini', 'grok'] as AIProvider[]).map((p) => (
                  <Button
                    key={p}
                    variant={provider === p ? 'default' : 'outline'}
                    onClick={() => setProvider(p)}
                    className="justify-start"
                  >
                    {p.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {provider === 'n8n' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="n8n-url">Webhook URL</Label>
                  <Input
                    id="n8n-url"
                    value={n8nUrl}
                    onChange={(e) => setN8nUrl(e.target.value)}
                    placeholder="https://your-n8n-instance.com/webhook/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="n8n-headers">Custom Headers (JSON)</Label>
                  <Textarea
                    id="n8n-headers"
                    value={n8nHeaders}
                    onChange={(e) => setN8nHeaders(e.target.value)}
                    placeholder='{"Authorization": "Bearer token"}'
                    rows={4}
                  />
                </div>
              </div>
            )}

            {provider === 'openai' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openai-model">Model</Label>
                  <Input
                    id="openai-model"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    placeholder="gpt-4-turbo-preview"
                  />
                </div>
              </div>
            )}

            {provider === 'gemini' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-key">API Key</Label>
                  <Input
                    id="gemini-key"
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AI..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gemini-model">Model</Label>
                  <Input
                    id="gemini-model"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    placeholder="gemini-pro"
                  />
                </div>
              </div>
            )}

            {provider === 'grok' && (
              <div className="space-y-2">
                <Label htmlFor="grok-key">API Key</Label>
                <Input
                  id="grok-key"
                  type="password"
                  value={grokKey}
                  onChange={(e) => setGrokKey(e.target.value)}
                  placeholder="xai-..."
                />
              </div>
            )}
          </div>

          {/* Preferences Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Preferences</h3>

            <div className="space-y-2">
              <Label>Font Size</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    variant={fontSize === size ? 'default' : 'outline'}
                    onClick={() => setFontSize(size)}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleClearAll}
                className="w-full"
              >
                <Trash2 size={16} className="mr-2" />
                Clear All Conversations
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
