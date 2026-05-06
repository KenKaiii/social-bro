import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth-utils';
import { repurposeScriptById } from '@/lib/repurpose';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Repurpose a script
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    // Rate limit expensive operations
    const rateLimit = checkRateLimit(`repurpose:${userId}`, RATE_LIMITS.expensive);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const result = await repurposeScriptById(userId, id);

    return NextResponse.json({
      success: true,
      repurposedScript: result.repurposedScript,
      hooks: result.hooks,
      chunksProcessed: result.chunksProcessed,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to repurpose script');
  }
}
