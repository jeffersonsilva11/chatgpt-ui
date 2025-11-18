'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

interface StreamingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export function StreamingText({
  text,
  speed = 20,
  onComplete,
  className,
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={cn('inline-block', className)}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5" />
      )}
    </span>
  );
}
