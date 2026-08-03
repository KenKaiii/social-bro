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

    // Both endpoints accept the handle directly, so they run in parallel
    // rather than chaining — this halves the round-trip for the common case.
    // The info lookup is still what distinguishes "no such account" (404)
    // from "account exists but has no posts" (empty table); for an unknown
    // handle the posts call simply resolves to [].
    const [userInfo, posts] = await Promise.all([
      getUserInfo(userId, username),
      getUserPosts({ userId, username }),
    ]);

    if (!userInfo) {
      return NextResponse.json({ error: `User @${username} not found` }, { status: 404 });
    }

    const tableData = transformUserPostsToTableData(posts);

    return NextResponse.json({
      user: userInfo,
      results: tableData,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch TikTok user');
  }
}
