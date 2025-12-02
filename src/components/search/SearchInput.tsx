'use client';

import { useRef, useMemo } from 'react';
import { Search, Loader2, AtSign } from 'lucide-react';
import type { Platform } from '@/types';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  platform?: Platform;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search for content...',
  disabled = false,
  isLoading = false,
  platform = 'youtube',
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const canSearch = value.trim().length > 0 && !disabled && !isLoading;

  // Detect @username mode
  const isChannelMode = useMemo(() => value.trim().startsWith('@'), [value]);

  // Platform-specific labels
  const modeLabel = platform === 'youtube' ? 'Channel Mode' : 'Username Mode';
  const buttonLabel = platform === 'youtube' ? 'Get Channel' : 'Get Username';
  const helperLabel = platform === 'youtube' ? 'channel' : 'username';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSearch) {
      e.preventDefault();
      onSearch();
    }
  };

  return (
    <div className="w-full">
      {/* Mode indicator - Nothing style uppercase label */}
      <div className="mb-2 sm:mb-3 flex h-3 justify-center">
        <span
          className={`uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[9px] sm:text-[10px] font-medium transition-opacity duration-200 ${
            isChannelMode ? 'text-white/50 opacity-100' : 'opacity-0'
          }`}
        >
          {modeLabel}
        </span>
      </div>

      <div
        className={`w-full rounded-xl sm:rounded-2xl border transition-all duration-300 ${
          isChannelMode
            ? 'border-white/30 bg-white/[0.08]'
            : 'border-white/10 bg-white/[0.03] hover:border-white/20'
        }`}
      >
        <div className="flex h-12 sm:h-14 items-center gap-3 sm:gap-4 px-3 sm:px-5">
          {isLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/40" />
          ) : isChannelMode ? (
            <AtSign className="h-4 w-4 shrink-0 text-white/70" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-white/30" />
          )}

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="min-w-0 flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 focus:outline-none disabled:opacity-50"
          />

          {canSearch && (
            <button
              onClick={onSearch}
              className={`shrink-0 rounded-lg sm:rounded-xl border px-3 sm:px-5 py-2 min-h-[36px] sm:min-h-[auto] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all duration-200 active:scale-95 ${
                isChannelMode
                  ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                  : 'border-white/20 bg-transparent text-white/70 hover:border-white/40 hover:text-white'
              }`}
            >
              {isChannelMode ? buttonLabel : 'Search'}
            </button>
          )}
        </div>
      </div>

      {/* Helper text - Nothing style */}
      <div className="mt-3 sm:mt-4 flex justify-center">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.15em] text-white/25">
          {isChannelMode ? (
            <span className="text-white/40">@{value.trim().slice(1) || '...'}</span>
          ) : (
            <span>
              Use <span className="text-white/40">@username</span> for {helperLabel}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
