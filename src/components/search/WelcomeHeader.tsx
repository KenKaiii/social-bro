'use client';

import { useState } from 'react';

const TEXT = 'Social Bro';

export function WelcomeHeader() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    const distance = Math.abs(index - hoveredIndex);
    // Max scale 1.4, decreasing by 0.15 per letter distance
    return Math.max(1, 1.4 - distance * 0.15);
  };

  const getTranslateY = (index: number) => {
    if (hoveredIndex === null) return 0;
    const distance = Math.abs(index - hoveredIndex);
    // Move up when scaled, max -8px at hovered letter
    return Math.min(0, -8 + distance * 3);
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 text-center px-4">
      <h1
        className="flex text-2xl sm:text-3xl md:text-4xl font-medium text-white font-doto"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {TEXT.split('').map((char, index) => (
          <span
            key={index}
            className="inline-block transition-transform duration-150 ease-out"
            style={{
              transform: `scale(${getScale(index)}) translateY(${getTranslateY(index)}px)`,
            }}
            onMouseEnter={() => setHoveredIndex(index)}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </h1>
    </div>
  );
}
