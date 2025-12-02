'use client';

import { useState } from 'react';
import { Youtube, Instagram, Music2, Settings2 } from 'lucide-react';
import type { Platform, PlatformConfig } from '@/types';
import { PLATFORMS } from '@/lib/constants';
import { YouTubeConfigModal } from '@/components/youtube/YouTubeConfigModal';

interface PlatformSelectorProps {
  selected: Platform;
  onSelect: (platform: Platform) => void;
}

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  const iconProps = { className: 'h-4 w-4' };

  switch (platform) {
    case 'youtube':
      return <Youtube {...iconProps} />;
    case 'instagram':
      return <Instagram {...iconProps} />;
    case 'tiktok':
      return <Music2 {...iconProps} />;
    default:
      return null;
  }
};

function PlatformCard({
  platform,
  isSelected,
  onClick,
}: {
  platform: PlatformConfig;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-2 min-h-[44px] text-xs sm:text-sm font-medium transition-all duration-150 active:scale-95 ${
        isSelected
          ? 'bg-white text-black'
          : 'border border-white/10 bg-transparent text-white/60 hover:border-white/20 hover:text-white'
      }`}
    >
      <PlatformIcon platform={platform.id} />
      <span>{platform.name}</span>
    </button>
  );
}

export function PlatformSelector({ selected, onSelect }: PlatformSelectorProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const isYouTubeSelected = selected === 'youtube';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {PLATFORMS.map((platform) => (
          <div key={platform.id} className="flex items-center">
            <PlatformCard
              platform={platform}
              isSelected={selected === platform.id}
              onClick={() => onSelect(platform.id)}
            />
            {/* Settings icon for YouTube - animated */}
            {platform.id === 'youtube' && (
              <div
                className="grid transition-all duration-200 ease-out"
                style={{
                  gridTemplateColumns: isYouTubeSelected ? '1fr' : '0fr',
                }}
              >
                <div className="overflow-hidden">
                  <button
                    onClick={() => setIsConfigOpen(true)}
                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-all hover:bg-white/15 hover:border-white/30 hover:text-white"
                    title="YouTube search settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <YouTubeConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </>
  );
}
