import { NextRequest, NextResponse } from 'next/server';
import { getUserInfo, getUserPosts, transformUserPostsToTableData } from '@/lib/rapidapi';
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

    // Look the account up first so a missing user is a 404 rather than an
    // empty result set.
    const userInfo = await getUserInfo(userId, username);

    if (!userInfo) {
      return NextResponse.json({ error: `User @${username} not found` }, { status: 404 });
    }

    const posts = await getUserPosts({
      userId,
      username: userInfo.username,
    });

    const tableData = transformUserPostsToTableData(posts);

    return NextResponse.json({
      user: userInfo,
      results: tableData,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch TikTok user');
  }
}
