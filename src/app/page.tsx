'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bookmark, BookmarkCheck, Loader2, Settings, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  SearchInput,
  PlatformSelector,
  PreviousSearches,
  addSearchToHistory,
} from '@/components/search';
import { WelcomeHeader } from '@/components/search/WelcomeHeader';
import { PreLoader } from '@/components/preloader';
import { ProcessingLoader } from '@/components/processing-loader';
import {
  DataTable,
  youtubeColumns,
  tiktokColumns,
  instagramColumns,
  repurposeColumns,
  scriptsColumns,
} from '@/components/data-table';
import { SettingsModal } from '@/components/settings';
import { UserMenu } from '@/components/auth';
import { getErrorMessage } from '@/lib/errors';
import {
  searchYouTubeWithDetails,
  searchTikTokWithDetails,
  searchInstagramWithDetails,
} from '@/lib/api';
import type {
  Platform,
  YouTubeTableData,
  TikTokTableData,
  SavedSearchWithResults,
  RepurposeVideo,
  Script,
} from '@/types';

type ViewMode = 'search' | 'results' | 'repurpose' | 'scripts';

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

  // Repurpose & Scripts state
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [repurposeVideos, setRepurposeVideos] = useState<RepurposeVideo[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoadingRepurpose, setIsLoadingRepurpose] = useState(false);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [viewingRepurposed, setViewingRepurposed] = useState(false);
  const [currentHookIndex, setCurrentHookIndex] = useState(0);
  const [isRegeneratingHooks, setIsRegeneratingHooks] = useState(false);

  // Processing loader state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingSubtitle, setProcessingSubtitle] = useState<string | undefined>();
  const [processingProgress, setProcessingProgress] = useState<
    { current: number; total: number } | undefined
  >();

  // Check if YouTube API key is configured
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch settings');
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          setHasYouTubeKey(false);
          return;
        }
        const youtubeKey = data.find(
          (k: { service: string; hasKey: boolean }) => k.service === 'youtube'
        );
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
      let results: YouTubeTableData[] | TikTokTableData[];

      if (selectedPlatform === 'tiktok') {
        results = await searchTikTokWithDetails(searchQuery);
      } else if (selectedPlatform === 'instagram') {
        results = await searchInstagramWithDetails(searchQuery);
      } else {
        results = await searchYouTubeWithDetails(searchQuery);
      }

      setTableData(results);
      if (results.length === 0) {
        toast.error('No results found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error(getErrorMessage(error, 'Search failed'));
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
    setViewMode('search');
    setSelectedScript(null);
  };

  // Fetch repurpose videos
  const fetchRepurposeVideos = useCallback(async () => {
    setIsLoadingRepurpose(true);
    try {
      const response = await fetch('/api/repurpose');
      if (response.ok) {
        const data = await response.json();
        setRepurposeVideos(data.videos || []);
      } else {
        toast.error('Failed to load repurpose list');
      }
    } catch {
      toast.error('Failed to load repurpose list');
    } finally {
      setIsLoadingRepurpose(false);
    }
  }, []);

  // Fetch scripts
  const fetchScripts = useCallback(async () => {
    setIsLoadingScripts(true);
    try {
      const response = await fetch('/api/scripts');
      if (response.ok) {
        const data = await response.json();
        setScripts(data.scripts || []);
      } else {
        toast.error('Failed to load scripts');
      }
    } catch {
      toast.error('Failed to load scripts');
    } finally {
      setIsLoadingScripts(false);
    }
  }, []);

  // Handle repurpose tab click
  const handleRepurposeTabClick = useCallback(() => {
    setViewMode('repurpose');
    setHasSearched(false);
    fetchRepurposeVideos();
  }, [fetchRepurposeVideos]);

  // Handle scripts tab click
  const handleScriptsTabClick = useCallback(() => {
    setViewMode('scripts');
    setHasSearched(false);
    setSelectedScript(null);
    fetchScripts();
  }, [fetchScripts]);

  // Handle delete repurpose video
  const handleDeleteRepurpose = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/repurpose?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setRepurposeVideos((prev) => prev.filter((v) => v.id !== id));
        toast.success('Video removed');
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  }, []);

  // Handle delete script
  const handleDeleteScript = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/scripts?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setScripts((prev) => prev.filter((s) => s.id !== id));
        toast.success('Script deleted');
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  }, []);

  // Handle transcript extracted
  const handleTranscriptExtracted = useCallback(() => {
    // Refresh scripts list
    fetchScripts();
  }, [fetchScripts]);

  // Handle view original script
  const handleViewOriginalScript = useCallback((script: Script) => {
    setSelectedScript(script);
    setViewingRepurposed(false);
  }, []);

  // Handle view repurposed script
  const handleViewRepurposedScript = useCallback((script: Script) => {
    setSelectedScript(script);
    setViewingRepurposed(true);
    setCurrentHookIndex(0); // Reset hook index when viewing new script
  }, []);

  // Handle script repurposed - refetch scripts list
  const handleScriptRepurposed = useCallback(async () => {
    try {
      const response = await fetch('/api/scripts');
      if (response.ok) {
        const data = await response.json();
        setScripts(data.scripts);
      }
    } catch (error) {
      console.error('Failed to refresh scripts:', error);
    }
  }, []);

  // Handle regenerate hooks
  const handleRegenerateHooks = useCallback(async () => {
    if (!selectedScript || isRegeneratingHooks) return;

    setIsRegeneratingHooks(true);
    try {
      const response = await fetch(`/api/scripts/${selectedScript.id}/regenerate-hooks`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.hooks) {
        // Update the selected script with new hooks
        setSelectedScript((prev) => (prev ? { ...prev, hooks: data.hooks } : null));
        // Also update in the scripts list
        setScripts((prev) =>
          prev.map((s) => (s.id === selectedScript.id ? { ...s, hooks: data.hooks } : s))
        );
        setCurrentHookIndex(0);
        toast.success('Hooks regenerated');
      } else {
        toast.error(data.error || 'Failed to regenerate hooks');
      }
    } catch {
      toast.error('Failed to regenerate hooks');
    } finally {
      setIsRegeneratingHooks(false);
    }
  }, [selectedScript, isRegeneratingHooks]);

  // Handle start repurpose - called from column button, shows full-screen loader
  const handleStartRepurpose = useCallback(async (script: Script): Promise<boolean> => {
    const wordCount = script.script.trim().split(/\s+/).filter(Boolean).length;
    const estimatedChunks = Math.ceil(wordCount / 4000); // Rough estimate based on chunk size

    setIsProcessing(true);
    setProcessingStatus('Repurposing transcript');
    setProcessingSubtitle(
      `${wordCount.toLocaleString()} words • ~${estimatedChunks} chunk${estimatedChunks > 1 ? 's' : ''}`
    );

    try {
      const response = await fetch(`/api/scripts/${script.id}/repurpose`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Repurposed successfully (${data.chunksProcessed} chunk${data.chunksProcessed > 1 ? 's' : ''})`
        );
        // Refresh scripts list
        const refreshResponse = await fetch('/api/scripts');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setScripts(refreshData.scripts);
        }
        return true;
      } else {
        toast.error(data.error || 'Failed to repurpose');
        return false;
      }
    } catch {
      toast.error('Failed to repurpose');
      return false;
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      setProcessingSubtitle(undefined);
    }
  }, []);

  // Handle URL repurpose - from search input with streaming progress
  const handleUrlRepurpose = useCallback(async (url: string) => {
    setIsProcessing(true);
    setProcessingStatus('Extracting transcript');
    setProcessingSubtitle('Connecting to YouTube...');
    setProcessingProgress(undefined);

    try {
      const response = await fetch('/api/repurpose-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to repurpose');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE format: "event: type\ndata: json\n\n"
          // Split on double newlines to get complete events
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // Keep incomplete event in buffer

          for (const event of events) {
            if (!event.trim()) continue;

            const lines = event.split('\n');
            let eventType = '';
            let eventData = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7);
              } else if (line.startsWith('data: ')) {
                eventData = line.slice(6);
              }
            }

            if (!eventType || !eventData) continue;

            let data;
            try {
              data = JSON.parse(eventData);
            } catch {
              console.error('Failed to parse SSE event data:', eventData);
              continue;
            }

            if (eventType === 'progress') {
              // Map step to user-friendly status with progress indicators
              // Steps: extracting(1) -> analyzing(2) -> processing_chunk(3-N) -> generating_hooks -> finalizing(N+1)
              const stepMessages: Record<
                string,
                { status: string; subtitle: string; baseProgress: number }
              > = {
                extracting: {
                  status: 'Extracting transcript',
                  subtitle: 'Fetching video content...',
                  baseProgress: 10,
                },
                analyzing: {
                  status: 'Analyzing content',
                  subtitle: 'Preparing for repurposing...',
                  baseProgress: 20,
                },
                processing_chunk: {
                  status: 'Repurposing content',
                  subtitle: 'AI is transforming your script...',
                  baseProgress: 30, // 30-85% range for chunks
                },
                generating_hooks: {
                  status: 'Generating hooks',
                  subtitle: 'Creating engaging openers...',
                  baseProgress: 90,
                },
                finalizing: {
                  status: 'Finalizing',
                  subtitle: 'Almost done...',
                  baseProgress: 95,
                },
              };

              const stepInfo = stepMessages[data.step] || {
                status: data.message,
                subtitle: '',
                baseProgress: 50,
              };
              setProcessingStatus(stepInfo.status);
              setProcessingSubtitle(stepInfo.subtitle);

              // Calculate progress based on step
              if (data.step === 'processing_chunk' && data.current && data.total) {
                // Chunk processing: 30% to 85%
                const chunkProgress = (data.current / data.total) * 55 + 30;
                setProcessingProgress({
                  current: Math.round(chunkProgress),
                  total: 100,
                });
              } else {
                // Other steps: use base progress
                setProcessingProgress({
                  current: stepInfo.baseProgress,
                  total: 100,
                });
              }
            } else if (eventType === 'complete') {
              toast.success(
                data.alreadyExists
                  ? 'Script already exists'
                  : `Repurposed successfully (${data.chunksProcessed} chunks)`
              );
              // Refresh scripts and navigate to scripts view
              const scriptsResponse = await fetch('/api/scripts');
              if (scriptsResponse.ok) {
                const scriptsData = await scriptsResponse.json();
                setScripts(scriptsData.scripts);
              }
              setSearchQuery('');
              setViewMode('scripts');
            } else if (eventType === 'error') {
              throw new Error(data.error || 'Failed to repurpose');
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to repurpose'));
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      setProcessingSubtitle(undefined);
      setProcessingProgress(undefined);
    }
  }, []);

  // Memoized columns
  const memoizedRepurposeColumns = useMemo(
    () => repurposeColumns(handleTranscriptExtracted, handleDeleteRepurpose, handleScriptsTabClick),
    [handleTranscriptExtracted, handleDeleteRepurpose, handleScriptsTabClick]
  );

  const memoizedScriptsColumns = useMemo(
    () =>
      scriptsColumns(
        handleViewOriginalScript,
        handleViewRepurposedScript,
        handleDeleteScript,
        handleScriptRepurposed,
        handleStartRepurpose
      ),
    [
      handleViewOriginalScript,
      handleViewRepurposedScript,
      handleDeleteScript,
      handleScriptRepurposed,
      handleStartRepurpose,
    ]
  );

  // Show repurpose view
  if (viewMode === 'repurpose') {
    return (
      <>
        {isProcessing && (
          <ProcessingLoader
            status={processingStatus}
            subtitle={processingSubtitle}
            progress={processingProgress}
          />
        )}
        <div className="min-h-screen px-3 sm:px-4 py-4 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 sm:mb-8">
              <button
                onClick={handleBackToSearch}
                className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <h1 className="text-lg sm:text-2xl font-semibold text-white">Repurpose List</h1>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                {isLoadingRepurpose ? 'Loading...' : `${repurposeVideos.length} videos saved`}
              </p>
            </div>
            <DataTable
              columns={memoizedRepurposeColumns}
              data={repurposeVideos}
              isLoading={isLoadingRepurpose}
              skeletonRows={5}
            />
          </div>
        </div>
      </>
    );
  }

  // Show scripts view
  if (viewMode === 'scripts') {
    // If viewing a specific script
    if (selectedScript) {
      const displayContent = viewingRepurposed
        ? selectedScript.repurposedScript || selectedScript.script
        : selectedScript.script;
      const displayTitle = selectedScript.title;

      // Get hooks array
      const hooks =
        viewingRepurposed && selectedScript.hooks && Array.isArray(selectedScript.hooks)
          ? (selectedScript.hooks as string[])
          : [];

      // Split content into paragraphs
      const paragraphs = displayContent
        .split(/\n\n+/)
        .flatMap((block) => {
          if (block.length > 500 && !block.includes('\n')) {
            const sentences = block.match(/[^.!?]+[.!?]+/g) || [block];
            const chunks: string[] = [];
            let current = '';
            sentences.forEach((s) => {
              if ((current + s).length > 400) {
                if (current) chunks.push(current.trim());
                current = s;
              } else {
                current += s;
              }
            });
            if (current) chunks.push(current.trim());
            return chunks;
          }
          return [block];
        })
        .filter((p) => p.trim());

      // Calculate estimated time per paragraph (avg 150 words per minute reading speed)
      const wordsPerParagraph = paragraphs.map((p) => p.trim().split(/\s+/).filter(Boolean).length);
      const cumulativeTime = wordsPerParagraph.reduce((acc: number[], words, i) => {
        const prevTime = i === 0 ? 0 : acc[i - 1];
        const timeForParagraph = (words / 150) * 60; // seconds
        acc.push(prevTime + timeForParagraph);
        return acc;
      }, [] as number[]);

      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      return (
        <div className="min-h-screen px-3 sm:px-4 py-4 sm:py-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 sm:mb-8">
              <button
                onClick={() => setSelectedScript(null)}
                className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <h1 className="text-base sm:text-lg font-semibold text-white">{displayTitle}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">
                  {new Date(selectedScript.createdAt).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">
                  {displayContent.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                </span>
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60 font-mono tabular-nums">
                  ~{formatTime(cumulativeTime[cumulativeTime.length - 1] || 0)} read
                </span>
                {viewingRepurposed && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400">
                    Repurposed
                  </span>
                )}
                {hooks.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs text-purple-400">
                    {hooks.length} hooks
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                {paragraphs.map((paragraph, i) => {
                  const isFirstParagraph = i === 0;
                  const hasHooks = hooks.length > 0 && isFirstParagraph && viewingRepurposed;
                  const displayText = hasHooks ? hooks[currentHookIndex] : paragraph.trim();
                  const startTime = i === 0 ? 0 : cumulativeTime[i - 1];

                  return (
                    <div
                      key={i}
                      className="flex gap-3 group -mx-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-default"
                    >
                      {/* Timestamp */}
                      <div className="flex-shrink-0 pt-0.5">
                        <span className="font-mono text-[10px] tabular-nums text-white/30 group-hover:text-white/70 transition-colors">
                          {formatTime(startTime)}
                        </span>
                      </div>
                      {/* Content */}
                      <div className="flex-1">
                        {hasHooks ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <button
                                onClick={() =>
                                  setCurrentHookIndex((prev) => (prev + 1) % hooks.length)
                                }
                                className="inline-flex items-center gap-1.5 text-[10px] text-purple-400 font-medium"
                              >
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20">
                                  Hook {currentHookIndex + 1}/{hooks.length}
                                </span>
                                <span className="text-purple-400/50">click to alternate</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRegenerateHooks();
                                }}
                                disabled={isRegeneratingHooks}
                                className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
                                title="Regenerate hooks"
                              >
                                <RefreshCw
                                  className={`h-3 w-3 ${isRegeneratingHooks ? 'animate-spin' : ''}`}
                                />
                                <span>{isRegeneratingHooks ? 'Regenerating...' : 'Retry'}</span>
                              </button>
                            </div>
                            <button
                              onClick={() =>
                                setCurrentHookIndex((prev) => (prev + 1) % hooks.length)
                              }
                              className="text-left w-full"
                            >
                              <p className="text-sm sm:text-base text-white/80 group-hover:text-white leading-7 transition-colors">
                                {displayText}
                              </p>
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm sm:text-base text-white/80 group-hover:text-white leading-7 transition-colors">
                            {displayText}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {isProcessing && (
          <ProcessingLoader
            status={processingStatus}
            subtitle={processingSubtitle}
            progress={processingProgress}
          />
        )}
        <div className="min-h-screen px-3 sm:px-4 py-4 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 sm:mb-8">
              <button
                onClick={handleBackToSearch}
                className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <h1 className="text-lg sm:text-2xl font-semibold text-white">Scripts</h1>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                {isLoadingScripts ? 'Loading...' : `${scripts.length} scripts`}
              </p>
            </div>
            <DataTable
              columns={memoizedScriptsColumns}
              data={scripts}
              isLoading={isLoadingScripts}
              skeletonRows={5}
            />
          </div>
        </div>
      </>
    );
  }

  // Show results view if we have searched
  if (hasSearched) {
    return (
      <>
        <div className="min-h-screen px-3 sm:px-4 py-4 sm:py-8">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <button
                  onClick={handleBackToSearch}
                  className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <h1 className="text-lg sm:text-2xl font-semibold text-white">
                  {viewingSavedSearch ? (
                    <>Saved: &ldquo;{searchQuery}&rdquo;</>
                  ) : (
                    <>Results for &ldquo;{searchQuery}&rdquo;</>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-white/60 mt-1">
                  {isSearching ? 'Searching...' : `${tableData.length} videos found`}
                </p>
              </div>

              {/* Save Button */}
              {!isSearching && tableData.length > 0 && (
                <button
                  onClick={handleSaveSearch}
                  disabled={isSaving || isSaved}
                  className={`flex items-center justify-center gap-2 rounded-lg sm:rounded-xl border px-4 py-2 min-h-[44px] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all duration-200 active:scale-95 ${
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
              columns={
                selectedPlatform === 'tiktok'
                  ? tiktokColumns
                  : selectedPlatform === 'instagram'
                    ? instagramColumns
                    : youtubeColumns
              }
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
      {isProcessing && (
        <ProcessingLoader
          status={processingStatus}
          subtitle={processingSubtitle}
          progress={processingProgress}
        />
      )}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-3 sm:px-4">
        {/* Top Right Controls */}
        <div className="fixed right-3 top-3 sm:right-6 sm:top-6 z-40 flex items-center gap-3">
          <UserMenu />
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

        {/* Main content - centered */}
        <div className="flex w-full max-w-[57.75rem] flex-col items-center gap-5 sm:gap-8 pt-16 sm:pt-0">
          {/* Welcome Header */}
          <WelcomeHeader />

          {/* Platform Selector */}
          <PlatformSelector selected={selectedPlatform} onSelect={setSelectedPlatform} />

          {/* Search Input */}
          <div className="w-full max-w-2xl px-1 sm:px-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              onUrlRepurpose={handleUrlRepurpose}
              placeholder="Search for videos, creators, or topics..."
              isLoading={isSearching || isProcessing}
              platform={selectedPlatform}
            />
          </div>
        </div>

        {/* Previous Searches - positioned at bottom */}
        <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 flex justify-center px-3 sm:px-4">
          <PreviousSearches
            onSearchSelect={handleSearchSelect}
            onSavedSearchSelect={handleSavedSearchSelect}
            onRepurposeTabClick={handleRepurposeTabClick}
            onScriptsTabClick={handleScriptsTabClick}
          />
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
