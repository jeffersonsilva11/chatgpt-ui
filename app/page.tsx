'use client';

import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/lib/store';
import { Sidebar } from '@/components/chat/Sidebar';
import { Header } from '@/components/chat/Header';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { SettingsModal } from '@/components/chat/SettingsModal';
import { Loading } from '@/components/ui/loading';
import { Message, MessageContentType } from '@/lib/types';
import { N8NProvider } from '@/lib/providers/n8n';
import { OpenAIProvider } from '@/lib/providers/openai';
import { GeminiProvider } from '@/lib/providers/gemini';
import { GrokProvider } from '@/lib/providers/grok';
import { MessageSquare } from 'lucide-react';

export default function Home() {
  const {
    loadConversations,
    loadSettings,
    getCurrentConversation,
    createConversation,
    addMessage,
    currentConversationId,
    settings,
    isLoading,
    setLoading,
    setError,
  } = useChatStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentConversation = getCurrentConversation();

  useEffect(() => {
    loadSettings();
    loadConversations();
  }, [loadConversations, loadSettings]);

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages, streamingMessage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for new conversation
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        createConversation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (
    text: string,
    type: MessageContentType,
    file?: string
  ) => {
    let conversationId = currentConversationId;

    // Create conversation if none exists
    if (!conversationId) {
      conversationId = createConversation();
    }

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: {
        type,
        text,
        ...(type === 'image' && file ? { imageBase64: file } : {}),
        ...(type === 'audio' && file ? { audioBase64: file } : {}),
      },
      timestamp: Date.now(),
    };

    addMessage(conversationId, userMessage);
    setLoading(true);
    setError(null);

    try {
      let responseText = '';

      // Send to appropriate provider
      if (settings.provider.type === 'n8n' && settings.provider.n8n) {
        // Validate N8N configuration
        if (!settings.provider.n8n.webhookUrl || settings.provider.n8n.webhookUrl.trim() === '') {
          throw new Error(
            'N8N webhook URL not configured. Please configure it in Settings.'
          );
        }

        const provider = new N8NProvider(settings.provider.n8n);
        const messageType: 'text' | 'image' | 'audio' =
          type === 'mixed' ? 'text' : type;
        const response = await provider.sendMessageWithRetry(
          text,
          messageType,
          file,
          conversationId,
          currentConversation?.messages || []
        );

        responseText = response.resposta;

        // Simulate streaming for N8N
        setStreamingMessage('');
        const words = responseText.split(' ');
        for (let i = 0; i < words.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 30));
          setStreamingMessage(words.slice(0, i + 1).join(' '));
        }
        setStreamingMessage(null);
      } else if (settings.provider.type === 'openai' && settings.provider.openai) {
        const provider = new OpenAIProvider(settings.provider.openai);
        setStreamingMessage('');

        responseText = await provider.sendMessage(
          text,
          currentConversation?.messages || [],
          (chunk) => {
            setStreamingMessage((prev) => (prev || '') + chunk);
          }
        );

        setStreamingMessage(null);
      } else if (settings.provider.type === 'gemini' && settings.provider.gemini) {
        const provider = new GeminiProvider(settings.provider.gemini);
        setStreamingMessage('');

        responseText = await provider.sendMessageStream(
          text,
          currentConversation?.messages || [],
          (chunk) => {
            setStreamingMessage((prev) => (prev || '') + chunk);
          }
        );

        setStreamingMessage(null);
      } else if (settings.provider.type === 'grok' && settings.provider.grok) {
        const provider = new GrokProvider(settings.provider.grok);
        setStreamingMessage('');

        responseText = await provider.sendMessage(
          text,
          currentConversation?.messages || [],
          (chunk) => {
            setStreamingMessage((prev) => (prev || '') + chunk);
          }
        );

        setStreamingMessage(null);
      } else {
        throw new Error(
          'Provider not configured. Please configure your AI provider in settings.'
        );
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: {
          type: 'text',
          text: responseText,
        },
        timestamp: Date.now(),
      };

      addMessage(conversationId, assistantMessage);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);

      // Add error message
      const errorMsg: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
        timestamp: Date.now(),
      };

      addMessage(conversationId, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onSettingsClick={() => setSettingsOpen(true)} />

      <div className="flex flex-1 flex-col">
        <Header />

        <main className="flex-1 overflow-y-auto">
          {!currentConversation || currentConversation.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <MessageSquare size={64} className="mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Start a conversation</h2>
                <p className="text-muted-foreground">
                  Send a message to begin chatting with AI
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Press <kbd className="px-2 py-1 bg-muted rounded">⌘ K</kbd> to start a
                  new conversation
                </p>
              </div>
            </div>
          ) : (
            <>
              {currentConversation.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {streamingMessage !== null && (
                <div className="flex w-full gap-4 px-4 py-6 bg-muted/30">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <MessageSquare size={18} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="markdown-content prose prose-sm dark:prose-invert max-w-none">
                      {streamingMessage}
                      <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              {isLoading && streamingMessage === null && (
                <div className="flex w-full gap-4 px-4 py-6 bg-muted/30">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <MessageSquare size={18} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Loading size="sm" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </main>

        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
