import { generateImage, ImageGenerationOptions } from '@/lib/image-generation';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route for Image Generation
 * Supports multiple providers: replicate, huggingface, ollama, comfyui
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, provider, ...options } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt is too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    console.log(`[API] Image generation request - Provider: ${provider || 'default'}, Prompt length: ${prompt.length}`);

    const generationOptions: ImageGenerationOptions = {
      prompt,
      negativePrompt: options.negativePrompt,
      width: options.width || 1024,
      height: options.height || 1024,
      numInferenceSteps: options.numInferenceSteps || 30,
      guidanceScale: options.guidanceScale || 7.5,
      seed: options.seed,
    };

    const result = await generateImage(
      generationOptions,
      provider || undefined
    );

    console.log(`[API] Image generation successful - Model: ${result.model}, Image URL: ${result.imageUrl.substring(0, 50)}...`);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[API] Image generation error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Image generation failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Image generation API is running',
    supportedProviders: ['replicate', 'huggingface', 'ollama', 'comfyui'],
  });
}
