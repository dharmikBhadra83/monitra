import { NextRequest, NextResponse } from 'next/server';
import { extractProductWithHyperAgent } from '@/lib/hyperagent-extractor';
import { extractProductWithHyperAgentV2, extractProductWithHyperAgentV2ExecuteTask } from '@/lib/hyperagent-extractor-v2';

/**
 * Test endpoint to compare different extraction strategies
 * Usage: POST /api/products/test-extraction
 * Body: { url: "https://...", strategy: "current" | "two-step" | "smart" | "element-specific" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, strategy = 'current' } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const startTime = Date.now();
    let result: any;
    let tokensUsed: number | null = null;
    let contentSize: number | null = null;

    console.log(`[Test Extraction] Testing strategy: ${strategy} for ${url}`);

    switch (strategy) {
      case 'current':
        result = await extractProductWithHyperAgent(url);
        break;
      case 'v2':
        result = await extractProductWithHyperAgentV2(url);
        break;
      case 'v2-execute-task':
        result = await extractProductWithHyperAgentV2ExecuteTask(url, true); // Enable caching
        break;
      case 'v2-execute-task-no-cache':
        result = await extractProductWithHyperAgentV2ExecuteTask(url, false); // Disable caching
        break;
      default:
        return NextResponse.json({ error: 'Invalid strategy. Use "current", "v2", "v2-execute-task", or "v2-execute-task-no-cache"' }, { status: 400 });
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      strategy,
      result,
      metrics: {
        duration: `${duration}ms`,
        tokensUsed,
        contentSize,
      },
    });
  } catch (error: any) {
    console.error('[Test Extraction] Error:', error);
    return NextResponse.json(
      { error: 'Extraction failed', details: error.message },
      { status: 500 }
    );
  }
}
