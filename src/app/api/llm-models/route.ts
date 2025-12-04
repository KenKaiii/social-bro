import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchOpenRouterModels } from '@/lib/openrouter';
import { requireUserId } from '@/lib/auth-utils';
import { isApiError } from '@/lib/errors';

// GET - Fetch all synced LLM models
export async function GET() {
  try {
    await requireUserId();

    const models = await prisma.llmModel.findMany({
      orderBy: [{ provider: 'asc' }, { name: 'asc' }],
    });

    // Cache for 1 hour - models rarely change
    return NextResponse.json(
      { models },
      {
        headers: {
          'Cache-Control': 'private, max-age=3600',
        },
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching LLM models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}

// POST - Sync models from OpenRouter
export async function POST(_request: NextRequest) {
  try {
    await requireUserId();

    // Fetch models from OpenRouter (doesn't require auth)
    const openRouterModels = await fetchOpenRouterModels();

    // Filter to only include text models (exclude image, audio, etc.)
    const textModels = openRouterModels.filter((model) => {
      const modality = model.architecture?.modality?.toLowerCase() || '';
      return modality.includes('text') || modality === '' || !model.architecture?.modality;
    });

    // Batch upsert all models in a single transaction
    // This reduces N database calls to a single atomic operation
    const upsertOperations = textModels.map((model) => {
      // Parse provider from model ID (e.g., "openai/gpt-4" -> "OpenAI")
      const providerSlug = model.id.split('/')[0];
      const provider = providerSlug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Parse prices (they come as string, price per token)
      // OpenRouter returns price per token, we store as price per 1M tokens
      const promptPrice = parseFloat(model.pricing.prompt) * 1_000_000;
      const completionPrice = parseFloat(model.pricing.completion) * 1_000_000;

      return prisma.llmModel.upsert({
        where: { modelId: model.id },
        update: {
          name: model.name,
          provider,
          promptPrice,
          completionPrice,
          contextLength: model.context_length || null,
          updatedAt: new Date(),
        },
        create: {
          modelId: model.id,
          name: model.name,
          provider,
          promptPrice,
          completionPrice,
          contextLength: model.context_length || null,
        },
      });
    });

    await prisma.$transaction(upsertOperations);
    const synced = textModels.length;

    return NextResponse.json({
      success: true,
      synced,
      message: `Synced ${synced} models from OpenRouter`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error syncing LLM models:', error);
    return NextResponse.json({ error: 'Failed to sync models' }, { status: 500 });
  }
}
