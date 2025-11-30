'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { YouTubeTableData } from '@/types';
import { formatNumber } from '@/lib/utils';

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
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.getValue('views'))}</span>
    ),
  },
  {
    accessorKey: 'likes',
    header: 'Likes',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.getValue('likes'))}</span>
    ),
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
    cell: () => (
      <button
        onClick={() => toast('Coming soon')}
        className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80
                   border border-white/10 hover:bg-white/10 hover:border-white/20
                   transition-all duration-200 hover:scale-105 active:scale-95"
      >
        Repurpose
      </button>
    ),
    enableSorting: false,
  },
];
