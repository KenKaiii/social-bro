'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface YouTubeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConfigState {
  maxResults: number;
  dateRange: string;
  region: string;
  videoDuration: string;
  order: string;
}

const DATE_RANGE_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: 'day', label: 'Last 24 hours' },
  { value: 'week', label: 'Last week' },
  { value: 'month', label: 'Last month' },
];

const VIDEO_DURATION_OPTIONS = [
  { value: 'any', label: 'Any duration' },
  { value: 'short', label: 'Shorts (< 4 min)' },
  { value: 'medium', label: 'Medium (4-20 min)' },
  { value: 'long', label: 'Long (> 20 min)' },
];

const ORDER_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Upload date' },
  { value: 'viewCount', label: 'View count' },
  { value: 'rating', label: 'Rating' },
];

const REGION_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'IN', label: 'India' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'PL', label: 'Poland' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'SG', label: 'Singapore' },
];

const MAX_RESULTS_OPTIONS = [10, 15, 20, 25, 30, 40, 50];

const DEFAULT_CONFIG: ConfigState = {
  maxResults: 25,
  dateRange: 'any',
  region: 'US',
  videoDuration: 'any',
  order: 'relevance',
};

export function YouTubeConfigModal({ isOpen, onClose }: YouTubeConfigModalProps) {
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedConfig, setSavedConfig] = useState<ConfigState>(DEFAULT_CONFIG);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/youtube/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setSavedConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch YouTube config:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen, fetchConfig]);

  useEffect(() => {
    const changed =
      config.maxResults !== savedConfig.maxResults ||
      config.dateRange !== savedConfig.dateRange ||
      config.region !== savedConfig.region ||
      config.videoDuration !== savedConfig.videoDuration ||
      config.order !== savedConfig.order;
    setHasChanges(changed);
  }, [config, savedConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/youtube/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedConfig(data);
        setHasChanges(false);
        toast.success('Settings saved');
      } else {
        toast.error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save YouTube config:', error);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (key: keyof ConfigState, value: string | number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg rounded-2xl border border-white/10 bg-black/90 p-6 shadow-2xl transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">YouTube Search Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Results count - visual buttons */}
            <div>
              <label className="mb-2.5 block text-sm font-medium text-white/70">
                Results per search
              </label>
              <div className="flex gap-2">
                {MAX_RESULTS_OPTIONS.map((num) => (
                  <button
                    key={num}
                    onClick={() => updateConfig('maxResults', num)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                      config.maxResults === num
                        ? 'bg-white text-black'
                        : 'border border-white/15 text-white/50 hover:border-white/30 hover:text-white/80'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdowns grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">Date Range</label>
                <select
                  value={config.dateRange}
                  onChange={(e) => updateConfig('dateRange', e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white transition-colors hover:border-white/25 focus:border-white/40 focus:outline-none"
                >
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-neutral-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">Duration</label>
                <select
                  value={config.videoDuration}
                  onChange={(e) => updateConfig('videoDuration', e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white transition-colors hover:border-white/25 focus:border-white/40 focus:outline-none"
                >
                  {VIDEO_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-neutral-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">Sort By</label>
                <select
                  value={config.order}
                  onChange={(e) => updateConfig('order', e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white transition-colors hover:border-white/25 focus:border-white/40 focus:outline-none"
                >
                  {ORDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-neutral-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">Region</label>
                <select
                  value={config.region}
                  onChange={(e) => updateConfig('region', e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white transition-colors hover:border-white/25 focus:border-white/40 focus:outline-none"
                >
                  {REGION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-neutral-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-white/90 disabled:opacity-40"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
