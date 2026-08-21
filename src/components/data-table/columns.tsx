'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, Check, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { YouTubeTableData, TikTokTableData, InstagramTableData, Platform } from '@/types';
import { formatNumber, formatRelativeTime } from '@/lib/utils';

/** Shared "Posted" column for platforms that expose a publish timestamp. */
function publishedAtColumn<T extends { publishedAt?: string }>(): ColumnDef<T> {
  return {
    accessorKey: 'publishedAt',
    header: 'Posted',
    cell: ({ row }) => (
      <span
        className="tabular-nums text-white/60"
        title={
          row.original.publishedAt
            ? new Date(row.original.publishedAt).toLocaleString()
            : 'Date unavailable'
        }
      >
        {formatRelativeTime(row.original.publishedAt)}
      </span>
    ),
    sortingFn: (a, b) =>
      (Date.parse(a.original.publishedAt ?? '') || 0) -
      (Date.parse(b.original.publishedAt ?? '') || 0),
  };
}

// Repurpose button component with loading state
// Only YouTube is currently supported for repurposing
function RepurposeButton({
  row,
  platform,
}: {
  row: YouTubeTableData | TikTokTableData;
  platform: Platform;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Repurpose is only available for YouTube videos
  if (platform !== 'youtube') {
    return <span className="text-white/30 text-xs">Not available</span>;
  }

  const handleRepurpose = async () => {
    if (isLoading || isSaved) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: row.id,
          platform,
          title: row.title,
          url: row.url,
          thumbnail: row.thumbnail,
          creatorName: row.username,
          viewCount: row.views,
          likeCount: row.likes,
          commentCount: row.comments,
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        toast.success('Added to repurpose list');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Failed to save video:', error);
      toast.error('Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRepurpose}
      disabled={isLoading || isSaved}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium
                 border transition-all duration-200 hover:scale-105 active:scale-95
                 disabled:hover:scale-100 disabled:cursor-default
                 ${
                   isSaved
                     ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                     : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                 }`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isSaved ? (
        <span className="flex items-center gap-1">
          <Check className="h-3.5 w-3.5" />
          Saved
        </span>
      ) : (
        'Repurpose'
      )}
    </button>
  );
}

export const youtubeColumns: ColumnDef<YouTubeTableData>[] = [
  {
    accessorKey: 'username',
    header: 'Username',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.thumbnail && (
          <Image
            src={row.original.thumbnail}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
          />
        )}
        <span className="font-medium text-white">{row.getValue('username')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.getValue('title')}>
        {row.getValue('title')}
      </div>
    ),
  },
  {
    accessorKey: 'views',
    header: 'Views',
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.getValue('views'))}</span>,
  },
  {
    accessorKey: 'likes',
    header: 'Likes',
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.getValue('likes'))}</span>,
  },
  {
    accessorKey: 'comments',
    header: 'Comments',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.getValue('comments'))}</span>
    ),
  },
  {
    accessorKey: 'engagementScore',
    header: 'Engagement',
    cell: ({ row }) => {
      const score = row.getValue('engagementScore') as number;
      const getScoreColor = (score: number) => {
        if (score >= 10) return 'text-green-400 bg-green-400/10';
        if (score >= 5) return 'text-yellow-400 bg-yellow-400/10';
        if (score >= 2) return 'text-orange-400 bg-orange-400/10';
        return 'text-red-400 bg-red-400/10';
      };

      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getScoreColor(score)}`}
        >
          {score.toFixed(2)}%
        </span>
      );
    },
  },
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ row }) => (
      <a
        href={row.getValue('url')}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        <span className="text-xs">View</span>
      </a>
    ),
    enableSorting: false,
  },
  {
    id: 'repurpose',
    header: 'Repurpose',
    cell: ({ row }) => <RepurposeButton row={row.original} platform="youtube" />,
    enableSorting: false,
  },
];

export const tiktokColumns: ColumnDef<TikTokTableData>[] = [
  {
    accessorKey: 'username',
    header: 'Username',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.thumbnail && (
          <Image
            src={row.original.thumbnail}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
          />
        )}
        <span className="font-medium text-white">@{row.getValue('username')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Description',
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.getValue('title')}>
        {row.getValue('title')}
      </div>
    ),
  },
  {
    accessorKey: 'views',
    header: 'Views',
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.getValue('views'))}</span>,
  },
  {
    accessorKey: 'likes',
    header: 'Likes',
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.getValue('likes'))}</span>,
  },
  {
    accessorKey: 'comments',
    header: 'Comments',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.getValue('comments'))}</span>
    ),
  },
  {
    accessorKey: 'engagementScore',
    header: 'Engagement',
    cell: ({ row }) => {
      const score = row.getValue('engagementScore') as number;
      const getScoreColor = (score: number) => {
        if (score >= 10) return 'text-green-400 bg-green-400/10';
        if (score >= 5) return 'text-yellow-400 bg-yellow-400/10';
        if (score >= 2) return 'text-orange-400 bg-orange-400/10';
        return 'text-red-400 bg-red-400/10';
      };

      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getScoreColor(score)}`}
        >
          {score.toFixed(2)}%
        </span>
      );
    },
  },
  publishedAtColumn<TikTokTableData>(),
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ row }) => (
      <a
        href={row.getValue('url')}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        <span className="text-xs">View</span>
      </a>
    ),
    enableSorting: false,
  },
  {
    id: 'repurpose',
    header: 'Repurpose',
    cell: ({ row }) => <RepurposeButton row={row.original} platform="tiktok" />,
    enableSorting: false,
  },
];

export const instagramColumns: ColumnDef<InstagramTableData>[] = [
  {
    accessorKey: 'username',
    header: 'Username',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.thumbnail && (
          <Image
            src={row.original.thumbnail}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
          />
        )}
        <span className="font-medium text-white">@{row.getValue('username')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Caption',
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.getValue('title')}>
        {row.getValue('title')}
      </div>
    ),
  },
  {
    accessorKey: 'views',
    header: 'Views',
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.getValue('views'))}</span>,
  },
  {
    accessorKey: 'likes',
    header: 'Likes',
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.getValue('likes'))}</span>,
  },
  {
    accessorKey: 'comments',
    header: 'Comments',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.getValue('comments'))}</span>
    ),
  },
  {
    accessorKey: 'engagementScore',
    header: 'Engagement',
    cell: ({ row }) => {
      const score = row.getValue('engagementScore') as number;
      const getScoreColor = (score: number) => {
        if (score >= 10) return 'text-green-400 bg-green-400/10';
        if (score >= 5) return 'text-yellow-400 bg-yellow-400/10';
        if (score >= 2) return 'text-orange-400 bg-orange-400/10';
        return 'text-red-400 bg-red-400/10';
      };

      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getScoreColor(score)}`}
        >
          {score.toFixed(2)}%
        </span>
      );
    },
  },
  publishedAtColumn<InstagramTableData>(),
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ row }) => (
      <a
        href={row.getValue('url')}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        <span className="text-xs">View</span>
      </a>
    ),
    enableSorting: false,
  },
  {
    id: 'repurpose',
    header: 'Repurpose',
    cell: ({ row }) => <RepurposeButton row={row.original} platform="instagram" />,
    enableSorting: false,
  },
];

// ============ REPURPOSE VIDEO COLUMNS ============

import type { RepurposeVideo, Script } from '@/types';

// Extract Transcript button component
function ExtractTranscriptButton({
  video,
  onExtract,
  onViewScripts,
}: {
  video: RepurposeVideo;
  onExtract: (video: RepurposeVideo) => void;
  onViewScripts: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracted, setIsExtracted] = useState(video.hasTranscript ?? false);

  const handleExtract = async () => {
    if (isLoading || video.platform !== 'youtube') return;

    // If already extracted, navigate to scripts
    if (isExtracted) {
      onViewScripts();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repurposeVideoId: video.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsExtracted(true);
        if (data.alreadyExists) {
          toast.success('Transcript already exists');
        } else {
          toast.success('Transcript extracted');
        }
        onExtract(video);
      } else {
        toast.error(data.error || 'Failed to extract');
      }
    } catch {
      toast.error('Failed to extract');
    } finally {
      setIsLoading(false);
    }
  };

  if (video.platform !== 'youtube') {
    return <span className="text-white/30 text-xs">Not available</span>;
  }

  return (
    <button
      onClick={handleExtract}
      disabled={isLoading}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium
                 border transition-all duration-200 hover:scale-105 active:scale-95
                 disabled:hover:scale-100 disabled:cursor-wait
                 ${
                   isExtracted
                     ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                     : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                 }`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isExtracted ? (
        'View'
      ) : (
        'Extract'
      )}
    </button>
  );
}

export const repurposeColumns = (
  onExtract: (video: RepurposeVideo) => void,
  onDelete: (id: string) => void,
  onViewScripts: () => void
): ColumnDef<RepurposeVideo>[] => [
  {
    accessorKey: 'creatorName',
    header: 'Creator',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.thumbnail && (
          <Image
            src={row.original.thumbnail}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
          />
        )}
        <span className="font-medium text-white">{row.original.creatorName || 'Unknown'}</span>
      </div>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <div className="max-w-[250px] truncate" title={row.getValue('title')}>
        {row.getValue('title')}
      </div>
    ),
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    cell: ({ row }) => <span className="capitalize text-white/70">{row.getValue('platform')}</span>,
  },
  {
    accessorKey: 'viewCount',
    header: 'Views',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.viewCount ? formatNumber(row.original.viewCount) : '-'}
      </span>
    ),
  },
  {
    accessorKey: 'savedAt',
    header: 'Saved',
    cell: ({ row }) => {
      const date = new Date(row.getValue('savedAt'));
      return <span className="text-white/60">{date.toLocaleDateString()}</span>;
    },
  },
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ row }) => (
      <a
        href={row.getValue('url')}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        <span className="text-xs">View</span>
      </a>
    ),
    enableSorting: false,
  },
  {
    id: 'extract',
    header: '',
    cell: ({ row }) => (
      <ExtractTranscriptButton
        video={row.original}
        onExtract={onExtract}
        onViewScripts={onViewScripts}
      />
    ),
    enableSorting: false,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <button
        onClick={() => onDelete(row.original.id)}
        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400
                   border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30
                   transition-all duration-200 hover:scale-105 active:scale-95"
      >
        Delete
      </button>
    ),
    enableSorting: false,
  },
];

// ============ SCRIPTS COLUMNS ============

// Repurposed column button - shows Repurpose action or View result
function RepurposedButton({
  script,
  onRepurposed,
  onViewRepurposed,
  onStartRepurpose,
}: {
  script: Script;
  onRepurposed: (script: Script) => void;
  onViewRepurposed: (script: Script) => void;
  onStartRepurpose: (script: Script) => Promise<boolean>;
}) {
  const hasRepurposed = !!script.repurposedScript;

  const handleClick = async () => {
    // If already repurposed, view the result
    if (hasRepurposed) {
      onViewRepurposed(script);
      return;
    }

    // Delegate to parent - it will handle the full-screen loader
    const success = await onStartRepurpose(script);
    if (success) {
      onRepurposed(script);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all duration-200 hover:scale-105 active:scale-95
                 ${
                   hasRepurposed
                     ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 hover:border-emerald-500/40'
                     : 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30 hover:border-purple-500/40'
                 }`}
    >
      {hasRepurposed ? 'View' : 'Repurpose'}
    </button>
  );
}

export const scriptsColumns = (
  onViewOriginal: (script: Script) => void,
  onViewRepurposed: (script: Script) => void,
  onDelete: (id: string) => void,
  onRepurposed: (script: Script) => void,
  onStartRepurpose: (script: Script) => Promise<boolean>
): ColumnDef<Script>[] => [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate font-medium text-white" title={row.getValue('title')}>
        {row.getValue('title')}
      </div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return <span className="text-white/60">{date.toLocaleDateString()}</span>;
    },
  },
  {
    id: 'wordCount',
    header: 'Words',
    cell: ({ row }) => {
      const script = row.original.script;
      const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
      return <span className="text-white/60 tabular-nums">{wordCount.toLocaleString()}</span>;
    },
    enableSorting: false,
  },
  {
    id: 'original',
    header: 'Original',
    cell: ({ row }) => (
      <button
        onClick={() => onViewOriginal(row.original)}
        className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400
                   border border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/40
                   transition-all duration-200 hover:scale-105 active:scale-95"
      >
        View
      </button>
    ),
    enableSorting: false,
  },
  {
    id: 'repurposed',
    header: 'Repurposed',
    cell: ({ row }) => (
      <RepurposedButton
        script={row.original}
        onRepurposed={onRepurposed}
        onViewRepurposed={onViewRepurposed}
        onStartRepurpose={onStartRepurpose}
      />
    ),
    enableSorting: false,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <button
        onClick={() => onDelete(row.original.id)}
        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400
                   border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30
                   transition-all duration-200 hover:scale-105 active:scale-95"
      >
        Delete
      </button>
    ),
    enableSorting: false,
  },
];
