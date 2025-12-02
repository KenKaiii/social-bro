'use client';

import { useEffect, useState, useCallback } from 'react';

interface PreLoaderProps {
  onComplete?: () => void;
  duration?: number;
}

const TEXT = 'Social Bro';

export function PreLoader({ onComplete, duration = 2000 }: PreLoaderProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [animatedIndex, setAnimatedIndex] = useState(-2);

  const getScale = useCallback(
    (index: number) => {
      if (animatedIndex < 0) return 1;
      const distance = Math.abs(index - animatedIndex);
      return Math.max(1, 1.4 - distance * 0.15);
    },
    [animatedIndex]
  );

  const getTranslateY = useCallback(
    (index: number) => {
      if (animatedIndex < 0) return 0;
      const distance = Math.abs(index - animatedIndex);
      return Math.min(0, -8 + distance * 3);
    },
    [animatedIndex]
  );

  useEffect(() => {
    // Start animation after a brief delay
    const startDelay = setTimeout(() => {
      setAnimatedIndex(0);
    }, 300);

    return () => clearTimeout(startDelay);
  }, []);

  useEffect(() => {
    if (animatedIndex < 0) return;

    // Animate through each character
    if (animatedIndex < TEXT.length + 2) {
      const timer = setTimeout(() => {
        setAnimatedIndex((prev) => prev + 1);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [animatedIndex]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <h1 className="flex text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-white font-doto">
        {TEXT.split('').map((char, index) => (
          <span
            key={index}
            className="inline-block transition-transform duration-150 ease-out"
            style={{
              transform: `scale(${getScale(index)}) translateY(${getTranslateY(index)}px)`,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </h1>
    </div>
  );
}
