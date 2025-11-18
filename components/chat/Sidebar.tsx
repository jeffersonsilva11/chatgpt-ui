'use client';

import { useChatStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import {
  PlusCircle,
  Settings,
  MessageSquare,
  Trash2,
  X,
  Menu,
  Search,
  Download,
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  exportConversationAsText,
  exportConversationAsJSON,
  downloadFile,
} from '@/lib/utils/storage';

interface SidebarProps {
  onSettingsClick: () => void;
}

export function Sidebar({ onSettingsClick }: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    sidebarOpen,
    createConversation,
    setCurrentConversation,
    deleteConversation,
    toggleSidebar,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewConversation = () => {
    createConversation();
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      deleteConversation(id);
    }
  };

  const handleExportConversation = (id: string, format: 'txt' | 'json', e: React.MouseEvent) => {
    e.stopPropagation();
    const conversation = conversations.find((c) => c.id === id);
    if (!conversation) return;

    if (format === 'txt') {
      const content = exportConversationAsText(conversation);
      downloadFile(content, `${conversation.title}.txt`, 'text/plain');
    } else {
      const content = exportConversationAsJSON(conversation);
      downloadFile(content, `${conversation.title}.json`, 'application/json');
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 transform bg-background border-r transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h1 className="text-lg font-semibold">Conversations</h1>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              <X size={20} />
            </Button>
          </div>

          {/* New conversation button */}
          <div className="p-4">
            <Button
              className="w-full justify-start gap-2"
              onClick={handleNewConversation}
            >
              <PlusCircle size={20} />
              New Conversation
            </Button>
          </div>

          {/* Search */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 scrollbar-hide">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground text-sm">
                <MessageSquare size={32} className="mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors',
                      currentConversationId === conversation.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => setCurrentConversation(conversation.id)}
                  >
                    <MessageSquare size={16} className="flex-shrink-0" />
                    <span className="flex-1 truncate">{conversation.title}</span>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleExportConversation(conversation.id, 'txt', e)}
                        title="Export as TXT"
                      >
                        <Download size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={onSettingsClick}
            >
              <Settings size={20} />
              Settings
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      {!sidebarOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-4 top-4 z-40 lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu size={20} />
        </Button>
      )}
    </>
  );
}
