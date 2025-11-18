'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import {
  Send,
  Image as ImageIcon,
  Mic,
  Square,
  X,
  Paperclip,
} from 'lucide-react';
import {
  fileToBase64,
  validateImageFile,
  createImageThumbnail,
  formatFileSize,
} from '@/lib/utils/file';
import { AudioRecorder, blobToBase64, formatDuration } from '@/lib/utils/audio';
import Image from 'next/image';

interface ChatInputProps {
  onSend: (message: string, type: 'text' | 'image' | 'audio', file?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageThumbnail, setImageThumbnail] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const maxChars = 4000;
  const charCount = message.length;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if ((!message.trim() && !imageFile) || disabled) return;

    if (imageFile) {
      const base64 = await fileToBase64(imageFile);
      onSend(message.trim(), 'image', base64);
      setImageFile(null);
      setImageThumbnail(null);
    } else {
      onSend(message.trim(), 'text');
    }

    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setImageFile(file);
    const thumbnail = await createImageThumbnail(file);
    setImageThumbnail(thumbnail);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageThumbnail(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      await audioRecorderRef.current.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1000);
      }, 1000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      const recording = await audioRecorderRef.current.stopRecording();
      const base64 = await blobToBase64(recording.blob);

      onSend('Voice message', 'audio', base64);

      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to stop recording');
    }
  };

  const cancelRecording = () => {
    audioRecorderRef.current.cancelRecording();
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  if (isRecording) {
    return (
      <div className="border-t bg-background p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive animate-pulse">
              <Mic size={20} className="text-destructive-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Recording...</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(recordingDuration)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={cancelRecording}>
              <X size={20} />
            </Button>
            <Button variant="default" size="icon" onClick={stopRecording}>
              <Square size={20} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="mx-auto max-w-4xl">
        {imageThumbnail && (
          <div className="mb-2 relative inline-block">
            <Image
              src={imageThumbnail}
              alt="Selected image"
              width={100}
              height={100}
              className="rounded-lg object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemoveImage}
            >
              <X size={14} />
            </Button>
            {imageFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatFileSize(imageFile.size)}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <Button
            variant="outline"
            size="icon"
            className="flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <ImageIcon size={20} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="flex-shrink-0"
            onClick={startRecording}
            disabled={disabled}
          >
            <Mic size={20} />
          </Button>

          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  setMessage(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[44px] max-h-[200px] resize-none pr-12"
              rows={1}
            />
            {charCount > 0 && (
              <div
                className={cn(
                  'absolute bottom-2 right-2 text-xs',
                  charCount >= maxChars * 0.9
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}
              >
                {charCount}/{maxChars}
              </div>
            )}
          </div>

          <Button
            size="icon"
            className="flex-shrink-0"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && !imageFile)}
          >
            <Send size={20} />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
