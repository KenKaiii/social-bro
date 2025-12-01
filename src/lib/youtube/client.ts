import { google, youtube_v3 } from 'googleapis';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export async function getYouTubeApiKey(userId: string): Promise<string> {
  // First, try to get from database for this user
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { userId_service: { userId, service: 'youtube' } },
  });

  if (apiKeyRecord) {
    return decrypt(apiKeyRecord.key);
  }

  // Fallback to environment variable
  const envKey = process.env.YOUTUBE_API_KEY;
  if (envKey) {
    return envKey;
  }

  throw new Error('YouTube API key not configured. Please add your API key in Settings.');
}

export async function getYouTubeClient(userId: string): Promise<youtube_v3.Youtube> {
  const apiKey = await getYouTubeApiKey(userId);
  return google.youtube({
    version: 'v3',
    auth: apiKey,
  });
}
