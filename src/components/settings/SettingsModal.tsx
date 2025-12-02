'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Eye, EyeOff, Check, Loader2, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';

type ApiKeyService = 'youtube' | 'rapidapi';

interface ApiKeyState {
  service: ApiKeyService;
  maskedKey: string | null;
  hasKey: boolean;
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

  useEffect(() => {
    if (isOpen) {
      fetchApiKeys();
      // Trigger entrance animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen, fetchApiKeys]);

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
        className={`relative w-[calc(100%-1.5rem)] sm:w-full max-w-lg mx-3 sm:mx-0 rounded-xl sm:rounded-2xl border border-white/10 bg-black/90 p-4 sm:p-6 shadow-2xl transition-all duration-300 max-h-[90vh] overflow-y-auto ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
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

        {/* API Keys Section */}
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="mb-3 sm:mb-4 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.15em] text-white/50">
              API Keys
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {(['youtube', 'rapidapi'] as ApiKeyService[]).map((service) => {
                  const keyState = apiKeys.find((k) => k.service === service);
                  const config = SERVICE_CONFIG[service];
                  const isEditing = editingService === service;

                  return (
                    <div
                      key={service}
                      className="rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="text-xs sm:text-sm font-medium text-white/80">{config.label}</label>
                        {keyState?.hasKey && !isEditing && (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-[10px] sm:text-xs text-white/40 truncate max-w-[80px] sm:max-w-none">{keyState.maskedKey}</span>
                            <button
                              onClick={() => handleDelete(service)}
                              disabled={isDeleting === service}
                              className="rounded-lg p-1.5 sm:p-1 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-white/30 transition-colors hover:bg-red-500/20 hover:text-red-400"
                            >
                              {isDeleting === service ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* RapidAPI info section */}
                      {service === 'rapidapi' && (
                        <div className="mb-3 flex items-start gap-2 sm:gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 sm:px-3 py-2 sm:py-2.5">
                          <Info className="mt-px h-3 w-3 flex-shrink-0 text-white/30" />
                          <div className="text-[10px] sm:text-[11px] leading-relaxed text-white/40">
                            <span>Subscribe to these APIs (free tier works):</span>
                            <div className="mt-1.5 flex flex-col sm:flex-row gap-1.5 sm:gap-3">
                              <a
                                href="https://rapidapi.com/irrors-apis/api/instagram-looter2/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/60 transition-colors hover:text-white"
                              >
                                Instagram Looter2
                              </a>
                              <a
                                href="https://rapidapi.com/Lundehund/api/tiktok-api23/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/60 transition-colors hover:text-white"
                              >
                                TikTok API23
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Edit form with smooth height animation */}
                      <div
                        className="grid transition-all duration-200 ease-out"
                        style={{
                          gridTemplateRows: isEditing ? '1fr' : '0fr',
                        }}
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
                                  if (e.key === 'Enter' && inputValue.trim()) {
                                    handleSave(service);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
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

                      {/* Add/Update button with smooth fade animation */}
                      <div
                        className="grid transition-all duration-200 ease-out"
                        style={{
                          gridTemplateRows: !isEditing ? '1fr' : '0fr',
                        }}
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
        </div>

        {/* Footer note */}
        <p className="mt-4 sm:mt-6 text-center text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.15em] text-white/25">
          API keys are encrypted and stored securely
        </p>
      </div>
    </div>
  );
}
