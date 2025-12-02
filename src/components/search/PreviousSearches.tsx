'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';
import { Bookmark, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Platform, SavedSearchWithResults } from '@/types';

export interface SearchHistory {
  id: string;
  query: string;
  platform: Platform;
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'social-bro-search-history';
const MAX_HISTORY = 20;

// Event for notifying search history updates
const HISTORY_UPDATE_EVENT = 'social-bro-history-update';

// Current user ID for localStorage key (set by component)
let currentUserId: string | null = null;

function getStorageKey(): string {
  return currentUserId ? `${STORAGE_KEY_PREFIX}-${currentUserId}` : STORAGE_KEY_PREFIX;
}

// Helper functions for localStorage
function getSearchHistory(): SearchHistory[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(getStorageKey());
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to parse search history from localStorage:', error);
    return [];
  }
}

function saveSearchHistory(history: SearchHistory[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(history));
    window.dispatchEvent(new Event(HISTORY_UPDATE_EVENT));
  } catch (error) {
    console.error('Failed to save search history to localStorage:', error);
  }
}

export function addSearchToHistory(query: string, platform: Platform): void {
  const history = getSearchHistory();

  // Remove duplicate if exists
  const filtered = history.filter(
    (h) => !(h.query.toLowerCase() === query.toLowerCase() && h.platform === platform)
  );

  // Add new search at the beginning
  const newSearch: SearchHistory = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    query,
    platform,
    timestamp: Date.now(),
  };

  const updated = [newSearch, ...filtered].slice(0, MAX_HISTORY);
  saveSearchHistory(updated);
}

function removeSearchFromHistory(id: string): void {
  const history = getSearchHistory();
  const filtered = history.filter((h) => h.id !== id);
  saveSearchHistory(filtered);
}

// Subscribe to search history changes for useSyncExternalStore
function subscribeToSearchHistory(callback: () => void): () => void {
  window.addEventListener(HISTORY_UPDATE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(HISTORY_UPDATE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

// Cache for snapshots to prevent infinite loops
const snapshotCache = {
  storageKey: null as string | null,
  dataString: null as string | null,
  data: [] as SearchHistory[],
};

function getSearchHistorySnapshot(): SearchHistory[] {
  if (typeof window === 'undefined') return snapshotCache.data;

  const storageKey = getStorageKey();
  const currentString = localStorage.getItem(storageKey);

  // Only update cache if data actually changed
  if (storageKey === snapshotCache.storageKey && currentString === snapshotCache.dataString) {
    return snapshotCache.data;
  }

  // Data or key changed, update cache
  snapshotCache.storageKey = storageKey;
  snapshotCache.dataString = currentString;
  snapshotCache.data = currentString ? JSON.parse(currentString) : [];

  return snapshotCache.data;
}

// Server snapshot - cached empty array
const emptyArray: SearchHistory[] = [];
function getServerSnapshot(): SearchHistory[] {
  return emptyArray;
}

// Set user ID (called from component via useEffect)
export function setSearchHistoryUserId(userId: string | null): void {
  if (currentUserId !== userId) {
    currentUserId = userId;
    // Trigger update so useSyncExternalStore re-reads
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(HISTORY_UPDATE_EVENT));
    }
  }
}

const TABS: { id: Platform | 'all' | 'saved'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'saved', label: 'Saved' },
];

interface PreviousSearchesProps {
  onSearchSelect: (query: string, platform: Platform) => void;
  onSavedSearchSelect: (savedSearch: SavedSearchWithResults) => void;
}

export function PreviousSearches({ onSearchSelect, onSavedSearchSelect }: PreviousSearchesProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Platform | 'all' | 'saved'>('all');
  const [savedSearches, setSavedSearches] = useState<SavedSearchWithResults[] | null>(null);

  // Set user ID for localStorage isolation
  useEffect(() => {
    setSearchHistoryUserId(session?.user?.id ?? null);
  }, [session?.user?.id]);

  // Use useSyncExternalStore to safely read from localStorage without hydration mismatch
  const searches = useSyncExternalStore(
    subscribeToSearchHistory,
    getSearchHistorySnapshot,
    getServerSnapshot
  );

  // Fetch saved searches when tab changes to 'saved'
  useEffect(() => {
    if (activeTab !== 'saved' || savedSearches !== null) return;

    fetch('/api/saved')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch saved searches');
        return res.json();
      })
      .then((data) => {
        setSavedSearches(data.savedSearches || []);
      })
      .catch((err) => {
        console.error('Failed to fetch saved searches:', err);
        setSavedSearches([]);
        toast.error('Failed to load saved');
      });
  }, [activeTab, savedSearches]);

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSearchFromHistory(id);
  };

  const handleDeleteSaved = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/saved?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setSavedSearches((prev) => prev?.filter((s) => s.id !== id) ?? null);
        toast.success('Deleted');
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filteredSearches =
    activeTab === 'all'
      ? searches
      : activeTab === 'saved'
        ? []
        : searches.filter((s) => s.platform === activeTab);

  // Show component if we have searches OR if we're on the saved tab
  if (searches.length === 0 && activeTab !== 'saved') return null;

  return (
    <div className="w-full max-w-4xl">
      {/* Header */}
      <h2 className="mb-3 sm:mb-4 text-xs sm:text-sm font-medium text-white/50">
        {activeTab === 'saved' ? 'Your saved searches' : 'Your previous searches'}
      </h2>

      {/* Tabs - horizontally scrollable on mobile */}
      <div className="mb-3 sm:mb-4 flex items-center gap-1 overflow-x-auto scrollbar-hidden pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 min-h-[36px] text-[10px] sm:text-xs font-medium transition-all duration-150 whitespace-nowrap active:scale-95 ${
              activeTab === tab.id ? 'bg-white text-black' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {tab.id === 'saved' && <Bookmark className="h-3 w-3" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search tiles - responsive height */}
      <div className="flex h-[120px] sm:h-[176px] flex-wrap content-start gap-1.5 sm:gap-2 overflow-hidden">
        {activeTab === 'saved' ? (
          savedSearches === null ? (
            <p className="text-xs sm:text-sm text-white/40">Loading saved searches...</p>
          ) : savedSearches.length === 0 ? (
            <p className="text-xs sm:text-sm text-white/40">No saved searches yet</p>
          ) : (
            savedSearches.map((saved) => (
              <div key={saved.id} className="group relative">
                <button
                  onClick={() => onSavedSearchSelect(saved)}
                  className="flex items-center gap-1.5 sm:gap-2 max-w-[140px] sm:max-w-[200px] truncate rounded-lg border border-white/20 bg-white/[0.08] px-2.5 sm:px-3 py-1.5 sm:py-2 pr-6 sm:pr-7 min-h-[36px] text-xs sm:text-sm text-white/80 transition-all duration-150 hover:border-white/30 hover:bg-white/[0.12] hover:text-white active:scale-95"
                >
                  <Bookmark className="h-3 w-3 shrink-0 text-white/50" />
                  <span className="truncate">{saved.query}</span>
                  <span className="shrink-0 text-[9px] sm:text-[10px] text-white/40">{saved.results.length}</span>
                </button>
                <button
                  onClick={(e) => handleDeleteSaved(e, saved.id)}
                  className="absolute right-0.5 sm:right-1 top-1/2 -translate-y-1/2 rounded p-1 min-h-[28px] min-w-[28px] flex items-center justify-center text-white/30 sm:text-white/0 transition-all sm:group-hover:text-white/40 hover:!text-white/80 hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          )
        ) : (
          filteredSearches.map((search) => (
            <div key={search.id} className="group relative">
              <button
                onClick={() => onSearchSelect(search.query, search.platform)}
                className="max-w-[120px] sm:max-w-[180px] truncate rounded-lg border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 pr-6 sm:pr-7 min-h-[36px] text-xs sm:text-sm text-white/70 transition-all duration-150 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
              >
                {search.query}
              </button>
              <button
                onClick={(e) => handleDeleteHistory(e, search.id)}
                className="absolute right-0.5 sm:right-1 top-1/2 -translate-y-1/2 rounded p-1 min-h-[28px] min-w-[28px] flex items-center justify-center text-white/30 sm:text-white/0 transition-all sm:group-hover:text-white/40 hover:!text-white/80 hover:bg-white/10"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
