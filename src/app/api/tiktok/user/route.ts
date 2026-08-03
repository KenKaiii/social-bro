import { NextRequest, NextResponse } from 'next/server';
import { getUserPosts, transformUserPostsToTableData } from '@/lib/rapidapi';
import { requireUserId } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Query parameter "username" is required' }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    const posts = await getUserPosts({
      userId,
      username,
    });

    const tableData = transformUserPostsToTableData(posts);

    return NextResponse.json({ results: tableData });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch TikTok user posts');
  }
}
