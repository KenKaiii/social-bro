'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { YouTubeTableData, TikTokTableData } from '@/types';
import { formatNumber } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  skeletonRows?: number;
}

// Mobile card component for video data
function MobileCard({
  item,
  index,
}: {
  item: YouTubeTableData | TikTokTableData;
  index: number;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 10) return 'text-green-400 bg-green-400/10';
    if (score >= 5) return 'text-yellow-400 bg-yellow-400/10';
    if (score >= 2) return 'text-orange-400 bg-orange-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[0.02] p-4 animate-table-row-in opacity-0"
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {/* Header: Avatar + Username + Engagement */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {item.thumbnail && (
            <Image
              src={item.thumbnail}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover shrink-0"
            />
          )}
          <span className="font-medium text-white text-sm truncate">
            {'username' in item && item.username?.startsWith('@')
              ? item.username
              : `@${item.username}`}
          </span>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${getScoreColor(item.engagementScore)}`}
        >
          {item.engagementScore.toFixed(1)}%
        </span>
      </div>

      {/* Title */}
      <p className="text-sm text-white/70 mb-3 line-clamp-2">{item.title}</p>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
        <span className="tabular-nums">
          <span className="text-white/30">Views:</span> {formatNumber(item.views)}
        </span>
        <span className="tabular-nums">
          <span className="text-white/30">Likes:</span> {formatNumber(item.likes)}
        </span>
        <span className="tabular-nums">
          <span className="text-white/30">Comments:</span> {formatNumber(item.comments)}
        </span>
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors text-sm min-h-[36px]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>View</span>
        </a>
        <button
          onClick={() => {
            // Coming soon toast handled by parent
          }}
          className="rounded-lg bg-white/5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-white/80
                     border border-white/10 hover:bg-white/10 hover:border-white/20
                     transition-all duration-200 active:scale-95"
        >
          Repurpose
        </button>
      </div>
    </div>
  );
}

// Mobile skeleton card
function MobileSkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[0.02] p-4 animate-pulse"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex items-center gap-4 mb-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  skeletonRows = 5,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const coreRowModel = useMemo(() => getCoreRowModel<TData>(), []);
  const sortedRowModel = useMemo(() => getSortedRowModel<TData>(), []);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  // Check if data is video data for mobile cards
  const isVideoData = data.length > 0 && 'username' in (data[0] as object);

  return (
    <div className="w-full">
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, index) => (
            <MobileSkeletonCard key={`mobile-skeleton-${index}`} index={index} />
          ))
        ) : isVideoData && data.length > 0 ? (
          (data as (YouTubeTableData | TikTokTableData)[]).map((item, index) => (
            <MobileCard key={item.id || index} item={item} index={index} />
          ))
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/40">
            No results found.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        isSortable &&
                          'cursor-pointer select-none hover:text-white/80 transition-colors'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {isSortable && (
                          <span className="text-white/40">
                            {sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : sortDirection === 'desc' ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </tr>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <TableRow
                  key={`skeleton-${rowIndex}`}
                  index={rowIndex}
                  isAnimated={true}
                  className="animate-pulse"
                >
                  {columns.map((_, colIndex) => (
                    <TableCell key={`skeleton-cell-${colIndex}`}>
                      <Skeleton
                        className={cn(
                          'h-4',
                          colIndex === 0 ? 'w-20' : colIndex === 1 ? 'w-40' : 'w-14'
                        )}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  index={index}
                  isAnimated={true}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow isAnimated={false}>
                <TableCell colSpan={columns.length} className="h-24 text-center text-white/40">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
