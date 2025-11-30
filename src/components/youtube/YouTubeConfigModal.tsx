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
            {/* Max Results */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <label className="mb-3 block text-sm font-medium text-white/80">
                Number of Results
              </label>
              <div className="flex flex-wrap gap-2">
                {MAX_RESULTS_OPTIONS.map((num) => (
                  <button
                    key={num}
                    onClick={() => updateConfig('maxResults', num)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                      config.maxResults === num
                        ? 'bg-white text-black'
                        : 'border border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <label className="mb-3 block text-sm font-medium text-white/80">Date Range</label>
              <div className="flex flex-wrap gap-2">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateConfig('dateRange', option.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                      config.dateRange === option.value
                        ? 'bg-white text-black'
                        : 'border border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Duration */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <label className="mb-3 block text-sm font-medium text-white/80">Video Duration</label>
              <div className="flex flex-wrap gap-2">
                {VIDEO_DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateConfig('videoDuration', option.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                      config.videoDuration === option.value
                        ? 'bg-white text-black'
                        : 'border border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <label className="mb-3 block text-sm font-medium text-white/80">Sort By</label>
              <div className="flex flex-wrap gap-2">
                {ORDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateConfig('order', option.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                      config.order === option.value
                        ? 'bg-white text-black'
                        : 'border border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Region */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <label className="mb-3 block text-sm font-medium text-white/80">Region</label>
              <select
                value={config.region}
                onChange={(e) => updateConfig('region', e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/[0.05] px-3 py-2 text-sm text-white transition-colors focus:border-white/40 focus:outline-none"
              >
                {REGION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-black text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
