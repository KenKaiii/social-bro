'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Trash2,
  RefreshCw,
  ChevronDown,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

type ApiKeyService = 'youtube' | 'rapidapi' | 'openrouter';
type GuideService = ApiKeyService | null;

interface ApiKeyState {
  service: ApiKeyService;
  maskedKey: string | null;
  hasKey: boolean;
}

interface LlmModel {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  promptPrice: number;
  completionPrice: number;
  contextLength: number | null;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SERVICE_CONFIG: Record<ApiKeyService, { label: string; placeholder: string }> = {
  youtube: {
    label: 'YouTube API Key',
    placeholder: 'Enter your YouTube Data API v3 key',
  },
  rapidapi: {
    label: 'RapidAPI Key',
    placeholder: 'Enter your RapidAPI key',
  },
  openrouter: {
    label: 'OpenRouter API Key',
    placeholder: 'Enter your OpenRouter API key',
  },
};

interface GuideStep {
  title: string;
  description: string;
  link?: { url: string; text: string };
}

interface GuideContent {
  title: string;
  description: string;
  steps: GuideStep[];
}

const GUIDE_CONTENT: Record<ApiKeyService, GuideContent> = {
  youtube: {
    title: 'YouTube API Key Setup',
    description: 'Get a free YouTube Data API v3 key from Google Cloud Console.',
    steps: [
      {
        title: 'Go to Google Cloud Console',
        description: 'Visit the Google Cloud Console and sign in with your Google account.',
        link: { url: 'https://console.cloud.google.com/', text: 'Open Console' },
      },
      {
        title: 'Create a new project',
        description: 'Click "Select a project" at the top, then "New Project". Name it anything.',
      },
      {
        title: 'Enable YouTube Data API',
        description: 'Go to "APIs & Services" > "Library". Search for "YouTube Data API v3".',
        link: {
          url: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
          text: 'Direct Link',
        },
      },
      {
        title: 'Create API credentials',
        description:
          'Go to "APIs & Services" > "Credentials". Click "Create Credentials" > "API Key".',
      },
      {
        title: 'Copy your API key',
        description: 'Your new API key will be displayed. Copy and paste it into the field above.',
      },
    ],
  },
  rapidapi: {
    title: 'RapidAPI Key Setup',
    description: 'Get a RapidAPI key and subscribe to the required APIs (free tier available).',
    steps: [
      {
        title: 'Create a RapidAPI account',
        description: 'Sign up for a free RapidAPI account using email or social login.',
        link: { url: 'https://rapidapi.com/auth/sign-up', text: 'Sign Up' },
      },
      {
        title: 'Subscribe to Instagram API',
        description: 'Visit the Instagram Looter2 API page and subscribe to the free plan.',
        link: {
          url: 'https://rapidapi.com/irrors-apis/api/instagram-looter2/',
          text: 'Instagram API',
        },
      },
      {
        title: 'Subscribe to TikTok API',
        description: 'Visit the TikTok API23 page and subscribe to the free plan as well.',
        link: { url: 'https://rapidapi.com/Lundehund/api/tiktok-api23/', text: 'TikTok API' },
      },
      {
        title: 'Subscribe to Transcript API',
        description: 'Visit the YouTube Transcript3 page and subscribe to the free plan.',
        link: {
          url: 'https://rapidapi.com/solid-api-solid-api-default/api/youtube-transcript3/',
          text: 'Transcript API',
        },
      },
      {
        title: 'Copy your API key',
        description: 'On any API page, find "X-RapidAPI-Key" in code snippets. Copy and paste it.',
      },
    ],
  },
  openrouter: {
    title: 'OpenRouter API Key Setup',
    description: 'Get an OpenRouter API key to access various AI models for repurposing.',
    steps: [
      {
        title: 'Create an OpenRouter account',
        description: 'Sign up for OpenRouter using your Google account or GitHub account.',
        link: { url: 'https://openrouter.ai/', text: 'Open Site' },
      },
      {
        title: 'Add credits to account',
        description: 'Some models are free. For paid models, add credits starting with $5.',
      },
      {
        title: 'Go to API Keys page',
        description: 'Click on "Keys" in the navigation menu to access the key management page.',
        link: { url: 'https://openrouter.ai/keys', text: 'Keys Page' },
      },
      {
        title: 'Generate a new API key',
        description: 'Click "Create Key" and give it a name. The key will only be shown once.',
      },
      {
        title: 'Copy your API key',
        description: 'Copy the generated key (starts with "sk-or-") and paste it into the field.',
      },
    ],
  },
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingService, setEditingService] = useState<ApiKeyService | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<ApiKeyService | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // LLM Models state
  const [llmModels, setLlmModels] = useState<LlmModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Guide panel state
  const [activeGuide, setActiveGuide] = useState<GuideService>(null);

  const handleOpenGuide = (service: ApiKeyService) => {
    setActiveGuide(service);
  };

  const handleCloseGuide = () => {
    setActiveGuide(null);
  };

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLlmModels = useCallback(async () => {
    try {
      const response = await fetch('/api/llm-models');
      if (response.ok) {
        const data = await response.json();
        setLlmModels(data.models || []);
      }
    } catch (error) {
      console.error('Failed to fetch LLM models:', error);
    }
  }, []);

  const fetchUserSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/user-settings');
      if (response.ok) {
        const data = await response.json();
        setSelectedModelId(data.selectedModelId || null);
      }
    } catch (error) {
      console.error('Failed to fetch user settings:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchApiKeys();
      fetchLlmModels();
      fetchUserSettings();
      // Trigger entrance animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      setIsDropdownOpen(false);
      setActiveGuide(null);
    }
  }, [isOpen, fetchApiKeys, fetchLlmModels, fetchUserSettings]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setModelSearch('');
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), 0);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Filter models based on search
  const filteredModels = llmModels.filter(
    (model) =>
      model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      model.provider.toLowerCase().includes(modelSearch.toLowerCase()) ||
      model.modelId.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const handleSave = async (service: ApiKeyService) => {
    if (!inputValue.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, key: inputValue.trim() }),
      });

      if (response.ok) {
        await fetchApiKeys();
        setEditingService(null);
        setInputValue('');
        setShowKey(false);
        toast.success('API key saved');
      } else {
        toast.error('Failed to save key');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error('Failed to save key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (service: ApiKeyService) => {
    setIsDeleting(service);
    try {
      const response = await fetch(`/api/settings?service=${service}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchApiKeys();
        toast.success('API key removed');
      } else {
        toast.error('Failed to remove key');
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to remove key');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleStartEdit = (service: ApiKeyService) => {
    setEditingService(service);
    setInputValue('');
    setShowKey(false);
    // Focus input after animation completes
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setInputValue('');
    setShowKey(false);
  };

  const handleSyncModels = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/llm-models', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        await fetchLlmModels();
        toast.success(`Synced ${data.synced} models`);
      } else {
        toast.error('Failed to sync models');
      }
    } catch (error) {
      console.error('Failed to sync models:', error);
      toast.error('Failed to sync models');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleModelSelect = async (modelId: string) => {
    setIsSavingModel(true);
    try {
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedModelId: modelId }),
      });

      if (response.ok) {
        setSelectedModelId(modelId);
        setIsDropdownOpen(false);
        toast.success('Model selected');
      } else {
        toast.error('Failed to save model selection');
      }
    } catch (error) {
      console.error('Failed to save model selection:', error);
      toast.error('Failed to save model selection');
    } finally {
      setIsSavingModel(false);
    }
  };

  const formatPrice = (price: number): string => {
    if (price === 0) return 'Free';
    if (price < 0.01) return `$${price.toFixed(4)}`;
    if (price < 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(2)}`;
  };

  const selectedModel = llmModels.find((m) => m.modelId === selectedModelId);

  if (!isOpen) return null;

  const guideContent = activeGuide ? GUIDE_CONTENT[activeGuide] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          if (activeGuide) {
            handleCloseGuide();
          } else {
            onClose();
          }
        }}
      />

      {/* Modal Container */}
      <div
        className={`flex items-start justify-center gap-2 transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Settings Modal */}
        <div className="relative w-[calc(100vw-1.5rem)] sm:w-full max-w-4xl mx-3 sm:mx-0 rounded-xl sm:rounded-2xl border border-white/10 bg-black/90 p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-medium text-white">Settings</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column - YouTube & RapidAPI */}
            <div className="space-y-4">
              <h3 className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.15em] text-white/50">
                Platform API Keys
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                </div>
              ) : (
                <div className="space-y-3">
                  {(['youtube', 'rapidapi'] as ApiKeyService[]).map((service) => {
                    const keyState = apiKeys.find((k) => k.service === service);
                    const config = SERVICE_CONFIG[service];
                    const isEditing = editingService === service;

                    return (
                      <div
                        key={service}
                        className="rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"
                      >
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs sm:text-sm font-medium text-white/80">
                              {config.label}
                            </label>
                            <button
                              onClick={() => handleOpenGuide(service)}
                              className={`hidden sm:flex rounded-md p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60 ${
                                activeGuide === service ? 'bg-white/10 text-white/60' : ''
                              }`}
                              title="Setup guide"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {keyState?.hasKey && !isEditing && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="text-[10px] sm:text-xs text-white/40">
                                {keyState.maskedKey}
                              </span>
                              <button
                                onClick={() => handleDelete(service)}
                                disabled={isDeleting === service}
                                className="rounded-md p-1 min-h-[28px] min-w-[28px] flex items-center justify-center text-white/30 transition-colors hover:bg-red-500/20 hover:text-red-400"
                              >
                                {isDeleting === service ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Edit form */}
                        <div
                          className="grid transition-all duration-200 ease-out"
                          style={{ gridTemplateRows: isEditing ? '1fr' : '0fr' }}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-3 pt-1">
                              <div className="relative">
                                <input
                                  ref={editingService === service ? inputRef : null}
                                  type={showKey ? 'text' : 'password'}
                                  value={inputValue}
                                  onChange={(e) => setInputValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && inputValue.trim()) handleSave(service);
                                    else if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  placeholder={config.placeholder}
                                  className="w-full rounded-lg border border-white/20 bg-white/[0.05] px-3 py-2 pr-10 text-sm text-white placeholder:text-white/30 transition-colors focus:border-white/40 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowKey(!showKey)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/60"
                                >
                                  {showKey ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              <div className="flex justify-end gap-2 pb-1">
                                <button
                                  onClick={handleCancelEdit}
                                  className="rounded-lg border border-white/20 px-3 py-1.5 min-h-[36px] text-[11px] sm:text-xs font-medium text-white/60 transition-all hover:border-white/30 hover:text-white active:scale-95"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSave(service)}
                                  disabled={!inputValue.trim() || isSaving}
                                  className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 min-h-[36px] text-[11px] sm:text-xs font-medium text-white transition-all hover:bg-white/20 disabled:opacity-50 active:scale-95"
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Add/Update button */}
                        <div
                          className="grid transition-all duration-200 ease-out"
                          style={{ gridTemplateRows: !isEditing ? '1fr' : '0fr' }}
                        >
                          <div className="overflow-hidden">
                            <button
                              onClick={() => handleStartEdit(service)}
                              className="w-full rounded-lg border border-dashed border-white/20 py-2 min-h-[40px] text-[11px] sm:text-xs text-white/40 transition-all hover:border-white/30 hover:text-white/60 active:scale-[0.98]"
                            >
                              {keyState?.hasKey ? 'Update key' : 'Add key'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column - OpenRouter & LLM Model */}
            <div className="space-y-4">
              <h3 className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.15em] text-white/50">
                AI Model
              </h3>

              {/* OpenRouter API Key */}
              {(() => {
                const service: ApiKeyService = 'openrouter';
                const keyState = apiKeys.find((k) => k.service === service);
                const config = SERVICE_CONFIG[service];
                const isEditing = editingService === service;

                return (
                  <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs sm:text-sm font-medium text-white/80">
                          {config.label}
                        </label>
                        <button
                          onClick={() => handleOpenGuide(service)}
                          className={`hidden sm:flex rounded-md p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60 ${
                            activeGuide === service ? 'bg-white/10 text-white/60' : ''
                          }`}
                          title="Setup guide"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {keyState?.hasKey && !isEditing && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] sm:text-xs text-white/40">
                            {keyState.maskedKey}
                          </span>
                          <button
                            onClick={() => handleDelete(service)}
                            disabled={isDeleting === service}
                            className="rounded-md p-1 min-h-[28px] min-w-[28px] flex items-center justify-center text-white/30 transition-colors hover:bg-red-500/20 hover:text-red-400"
                          >
                            {isDeleting === service ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Edit form */}
                    <div
                      className="grid transition-all duration-200 ease-out"
                      style={{ gridTemplateRows: isEditing ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-3 pt-1">
                          <div className="relative">
                            <input
                              ref={editingService === service ? inputRef : null}
                              type={showKey ? 'text' : 'password'}
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && inputValue.trim()) handleSave(service);
                                else if (e.key === 'Escape') handleCancelEdit();
                              }}
                              placeholder={config.placeholder}
                              className="w-full rounded-lg border border-white/20 bg-white/[0.05] px-3 py-2 pr-10 text-sm text-white placeholder:text-white/30 transition-colors focus:border-white/40 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/60"
                            >
                              {showKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <div className="flex justify-end gap-2 pb-1">
                            <button
                              onClick={handleCancelEdit}
                              className="rounded-lg border border-white/20 px-3 py-1.5 min-h-[36px] text-[11px] sm:text-xs font-medium text-white/60 transition-all hover:border-white/30 hover:text-white active:scale-95"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSave(service)}
                              disabled={!inputValue.trim() || isSaving}
                              className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 min-h-[36px] text-[11px] sm:text-xs font-medium text-white transition-all hover:bg-white/20 disabled:opacity-50 active:scale-95"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Add/Update button */}
                    <div
                      className="grid transition-all duration-200 ease-out"
                      style={{ gridTemplateRows: !isEditing ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <button
                          onClick={() => handleStartEdit(service)}
                          className="w-full rounded-lg border border-dashed border-white/20 py-2 min-h-[40px] text-[11px] sm:text-xs text-white/40 transition-all hover:border-white/30 hover:text-white/60 active:scale-[0.98]"
                        >
                          {keyState?.hasKey ? 'Update key' : 'Add key'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* LLM Model Selection */}
              <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 overflow-visible">
                <div className="mb-3">
                  <label className="text-xs sm:text-sm font-medium text-white/80">
                    Selected Model
                  </label>
                </div>

                {/* Model Dropdown */}
                <div ref={dropdownRef} className="relative mb-3">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={llmModels.length === 0 || isSavingModel}
                    className="flex w-full items-center justify-between rounded-lg border border-white/20 bg-white/[0.05] pl-3 pr-4 py-2.5 min-h-[44px] text-left text-sm text-white transition-colors hover:border-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
                  >
                    <span className="truncate">
                      {selectedModel ? (
                        <span className="flex items-center gap-2">
                          <span className="truncate">{selectedModel.name}</span>
                          <span className="text-white/40 text-xs">
                            {formatPrice(selectedModel.promptPrice)}/1M
                          </span>
                        </span>
                      ) : llmModels.length === 0 ? (
                        <span className="text-white/40">No models - click Sync</span>
                      ) : (
                        <span className="text-white/40">Select a model</span>
                      )}
                    </span>
                    {isSavingModel ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white/40 flex-shrink-0" />
                    ) : (
                      <ChevronDown
                        className={`h-4 w-4 text-white/40 flex-shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  {/* Dropdown Menu - opens upward to avoid being clipped */}
                  {isDropdownOpen && llmModels.length > 0 && (
                    <div className="absolute left-0 right-0 bottom-full z-50 mb-1 rounded-lg border border-white/20 bg-black shadow-xl">
                      {/* Search Input */}
                      <div className="p-2 border-b border-white/10">
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          placeholder="Search models..."
                          className="w-full rounded-md border border-white/20 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
                        />
                      </div>
                      {/* Model List */}
                      <div className="max-h-48 overflow-y-auto">
                        {filteredModels.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-white/40">
                            No models found
                          </div>
                        ) : (
                          filteredModels.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                handleModelSelect(model.modelId);
                                setModelSearch('');
                              }}
                              className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/10 ${
                                model.modelId === selectedModelId
                                  ? 'bg-white/5 text-white'
                                  : 'text-white/80'
                              }`}
                            >
                              <span className="truncate pr-2">{model.name}</span>
                              <span className="text-white/40 text-xs flex-shrink-0">
                                {formatPrice(model.promptPrice)}/1M
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sync Button */}
                <button
                  onClick={handleSyncModels}
                  disabled={isSyncing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-2 min-h-[40px] text-[11px] sm:text-xs text-white/40 transition-all hover:border-white/30 hover:text-white/60 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Sync models
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-4 sm:mt-6 text-center text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.15em] text-white/25">
            API keys are encrypted and stored securely
          </p>
        </div>

        {/* Guide Panel */}
        {activeGuide && guideContent && (
          <div
            className="hidden sm:block w-[520px] flex-shrink-0 rounded-xl sm:rounded-2xl border border-white/10 bg-black/90 p-4 sm:p-6 shadow-2xl max-h-[70vh] overflow-y-auto"
            style={{
              animation: 'guideSlideIn 0.3s ease-out forwards',
            }}
          >
            {/* Guide Header */}
            <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-medium text-white">
                  {guideContent.title}
                </h3>
                <p className="mt-1 text-[11px] sm:text-xs text-white/50">
                  {guideContent.description}
                </p>
              </div>
              <button
                onClick={handleCloseGuide}
                className="rounded-lg p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-white/40 transition-colors hover:bg-white/10 hover:text-white flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {guideContent.steps.map((step, index) => (
                <div key={index} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-white/60">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-white/80">{step.title}</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                        {step.description}
                      </p>
                      {step.link && (
                        <a
                          href={step.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/60 transition-colors hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {step.link.text}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
