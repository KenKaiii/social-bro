import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/db';
import { createChatCompletion } from '@/lib/openrouter';
import { HOOKS_SYSTEM_PROMPT, HOOKS_PROMPT } from '@/lib/repurpose/prompts';
import { extractOriginalHook } from '@/lib/repurpose/chunker';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Regenerate hooks for a script
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    // Get the script
    const script = await prisma.script.findUnique({
      where: { id },
    });

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    if (script.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's selected model
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings?.selectedModelId) {
      return NextResponse.json(
        { error: 'No LLM model selected. Please select a model in Settings.' },
        { status: 400 }
      );
    }

    // Extract original hook from the script
    const originalHook = extractOriginalHook(script.script);
    const prompt = HOOKS_PROMPT.replace('{originalHook}', originalHook);

    // Generate new hooks
    const response = await createChatCompletion({
      userId,
      model: settings.selectedModelId,
      messages: [
        { role: 'system', content: HOOKS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9, // Higher temperature for more variation
    });

    const content = response.choices[0]?.message?.content || '[]';

    // Parse the JSON array
    let hooks: string[] = [];
    try {
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedContent);

      if (Array.isArray(parsed) && parsed.length >= 3) {
        hooks = parsed.slice(0, 3);
      } else if (Array.isArray(parsed)) {
        hooks = parsed;
      }
    } catch {
      // Fallback: try to extract hooks from text
      const lines = content.split('\n').filter((line) => line.trim().length > 10);
      hooks = lines.slice(0, 3).map((line) => line.replace(/^[\d.\-*]+\s*/, '').trim());
    }

    // Update the script with new hooks
    await prisma.script.update({
      where: { id },
      data: { hooks },
    });

    return NextResponse.json({
      success: true,
      hooks,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to regenerate hooks');
  }
}
