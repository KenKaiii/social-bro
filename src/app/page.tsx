'use client';

import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import {
  SearchInput,
  PlatformSelector,
  PreviousSearches,
  addSearchToHistory,
} from '@/components/search';
import { WelcomeHeader } from '@/components/search/WelcomeHeader';
import { PreLoader } from '@/components/preloader';
import { DataTable, youtubeColumns } from '@/components/data-table';
import { SettingsModal } from '@/components/settings';
import { searchYouTubeWithDetails } from '@/lib/api';
import type { Platform, YouTubeTableData, SavedSearchWithResults } from '@/types';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('youtube');
  const [showPreLoader, setShowPreLoader] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [tableData, setTableData] = useState<YouTubeTableData[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [viewingSavedSearch, setViewingSavedSearch] = useState<SavedSearchWithResults | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasYouTubeKey, setHasYouTubeKey] = useState<boolean | null>(null);

  // Check if YouTube API key is configured
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        const youtubeKey = data.find((k: { service: string; hasKey: boolean }) => k.service === 'youtube');
        setHasYouTubeKey(youtubeKey?.hasKey ?? false);
      })
      .catch(() => setHasYouTubeKey(false));
  }, [isSettingsOpen]); // Re-check when settings modal closes

  const handleSearch = async () => {
    if (!searchQuery.trim() || isSearching) return;

    // Check if YouTube API key is configured
    if (selectedPlatform === 'youtube' && !hasYouTubeKey) {
      toast.error('Add YouTube API key in Settings');
      setIsSettingsOpen(true);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setIsSaved(false);
    setViewingSavedSearch(null);

    // Add to search history
    addSearchToHistory(searchQuery.trim(), selectedPlatform);

    try {
      const results = await searchYouTubeWithDetails(searchQuery);
      setTableData(results);
      if (results.length === 0) {
        toast.error('No results found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveSearch = async () => {
    if (isSaving || isSaved || tableData.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          platform: selectedPlatform,
          data: tableData,
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        toast.success('Search saved');
      } else {
        toast.error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save search:', error);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearchSelect = (query: string, platform: Platform) => {
    setSearchQuery(query);
    setSelectedPlatform(platform);
  };

  const handleSavedSearchSelect = (savedSearch: SavedSearchWithResults) => {
    setViewingSavedSearch(savedSearch);
    setSearchQuery(savedSearch.query);
    setSelectedPlatform(savedSearch.platform);
    setTableData(savedSearch.results);
    setHasSearched(true);
    setIsSaved(true);
  };

  const handleBackToSearch = () => {
    setHasSearched(false);
    setTableData([]);
    setSearchQuery('');
    setIsSaved(false);
    setViewingSavedSearch(null);
  };

  // Show results view if we have searched
  if (hasSearched) {
    return (
      <>
        <div className="min-h-screen px-4 py-8">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <button
                  onClick={handleBackToSearch}
                  className="mb-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  &larr; Back to search
                </button>
                <h1 className="text-2xl font-semibold text-white">
                  {viewingSavedSearch ? (
                    <>Saved: &ldquo;{searchQuery}&rdquo;</>
                  ) : (
                    <>Results for &ldquo;{searchQuery}&rdquo;</>
                  )}
                </h1>
                <p className="text-sm text-white/60 mt-1">
                  {isSearching ? 'Searching...' : `${tableData.length} videos found`}
                </p>
              </div>

              {/* Save Button */}
              {!isSearching && tableData.length > 0 && (
                <button
                  onClick={handleSaveSearch}
                  disabled={isSaving || isSaved}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em] transition-all duration-200 ${
                    isSaved
                      ? 'border-white/30 bg-white/10 text-white/70'
                      : 'border-white/20 bg-transparent text-white/70 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSaved ? (
                    <BookmarkCheck className="h-4 w-4" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              )}
            </div>

            {/* Data Table */}
            <DataTable
              columns={youtubeColumns}
              data={tableData}
              isLoading={isSearching}
              skeletonRows={10}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showPreLoader && <PreLoader onComplete={() => setShowPreLoader(false)} />}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
        {/* Settings Button - Top Right */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="fixed right-6 top-6 z-40 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-white/50 transition-colors hover:text-white"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>

        {/* Main content - centered */}
        <div className="flex w-full max-w-[57.75rem] flex-col items-center gap-8">
          {/* Welcome Header */}
          <WelcomeHeader />

          {/* Platform Selector */}
          <PlatformSelector selected={selectedPlatform} onSelect={setSelectedPlatform} />

          {/* Search Input */}
          <div className="w-full max-w-2xl">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              placeholder="Search for videos, creators, or topics..."
              isLoading={isSearching}
            />
          </div>
        </div>

        {/* Previous Searches - absolute positioned at bottom */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
          <PreviousSearches
            onSearchSelect={handleSearchSelect}
            onSavedSearchSelect={handleSavedSearchSelect}
          />
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
