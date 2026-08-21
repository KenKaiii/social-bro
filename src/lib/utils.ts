import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return '—';
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function calculateEngagement(views: number, likes: number, comments: number): number {
  if (!views || views === 0) return 0;
  return ((likes + comments) / views) * 100;
}

/**
 * Compact relative age of a publish date, e.g. "3d", "2w", "5mo".
 *
 * Returns an em dash when the timestamp is missing or unparseable, since the
 * providers omit it on some items.
 */
export function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return '—';

  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return '—';

  const seconds = Math.max(0, (Date.now() - timestamp) / 1000);
  const hours = seconds / 3600;

  if (hours < 1) return 'now';
  if (hours < 24) return `${Math.floor(hours)}h`;

  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

/**
 * Decode HTML entities in a string (e.g., &#39; -> ', &amp; -> &)
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
    '&#x2F;': '/',
    '&nbsp;': ' ',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replaceAll(entity, char);
  }

  // Handle numeric entities like &#123;
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

  // Handle hex entities like &#x1F;
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  return decoded;
}
