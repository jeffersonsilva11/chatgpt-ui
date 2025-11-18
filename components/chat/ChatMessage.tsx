'use client';

import { Message } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChatStore } from '@/lib/store';
import { User, Bot, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { settings } = useChatStore();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'flex w-full gap-4 px-4 py-6 animate-slide-in',
        isUser ? 'bg-background' : 'bg-muted/30'
      )}
    >
      <div className="flex-shrink-0">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          )}
        >
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="space-y-2">
          {message.content.text && (
            <div
              className={cn(
                'markdown-content prose prose-sm dark:prose-invert max-w-none',
                settings.fontSize === 'small' && 'text-sm',
                settings.fontSize === 'large' && 'text-lg'
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ node, className, children }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = !match;
                    const codeString = String(children).replace(/\n$/, '');

                    if (inline) {
                      return (
                        <code className={className}>
                          {children}
                        </code>
                      );
                    }

                    return (
                      <div className="relative group">
                        <button
                          onClick={() => handleCopy(codeString)}
                          className="absolute right-2 top-2 p-2 rounded-md bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Copy code"
                        >
                          {copied ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                        <SyntaxHighlighter
                          language={match[1]}
                          style={settings.theme === 'dark' ? (oneDark as any) : (oneLight as any)}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.5rem',
                            fontSize:
                              settings.fontSize === 'small'
                                ? '0.75rem'
                                : settings.fontSize === 'large'
                                ? '0.95rem'
                                : '0.875rem',
                          }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content.text}
              </ReactMarkdown>
            </div>
          )}

          {(message.content.imageUrl || message.content.imageBase64) && (
            <div className="relative mt-2 max-w-md">
              <Image
                src={
                  message.content.imageUrl ||
                  `data:image/png;base64,${message.content.imageBase64}`
                }
                alt="Attached image"
                width={400}
                height={300}
                className="rounded-lg object-cover"
                unoptimized={!!message.content.imageBase64}
              />
            </div>
          )}

          {(message.content.audioUrl || message.content.audioBase64) && (
            <div className="mt-2">
              <audio
                controls
                src={
                  message.content.audioUrl ||
                  `data:audio/webm;base64,${message.content.audioBase64}`
                }
                className="w-full max-w-md"
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
