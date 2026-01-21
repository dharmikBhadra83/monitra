/**
 * Image Generation Service
 * Supports multiple open-source/community NSFW image generation models
 */

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
}

export interface ImageGenerationResult {
  imageUrl: string;
  model: string;
  metadata?: {
    seed?: number;
    steps?: number;
    generationTime?: number;
  };
}

// ============================================
// APPROACH 1: Replicate API (Recommended for NSFW)
// ============================================
// Replicate hosts many uncensored Stable Diffusion models
// Models: stable-diffusion-xl, flux-schnell, etc.

export async function generateImageWithReplicate(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  
  if (!REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN environment variable is required');
  }

  // Popular NSFW-capable models on Replicate:
  // - stability-ai/stable-diffusion-xl-base-1.0
  // - black-forest-labs/flux-schnell
  // - runwayml/stable-diffusion-v1-5 (with fine-tunes)
  const model = process.env.REPLICATE_MODEL || "stability-ai/stable-diffusion-xl-base-1.0";

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // SDXL base version
      input: {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || "blurry, low quality, distorted",
        width: options.width || 1024,
        height: options.height || 1024,
        num_inference_steps: options.numInferenceSteps || 30,
        guidance_scale: options.guidanceScale || 7.5,
        seed: options.seed,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate API error: ${error}`);
  }

  const prediction = await response.json();

  // Poll for completion
  let result = prediction;
  while (result.status === "starting" || result.status === "processing") {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const statusResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      {
        headers: {
          "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        },
      }
    );
    result = await statusResponse.json();
  }

  if (result.status === "failed") {
    throw new Error(`Image generation failed: ${result.error}`);
  }

  return {
    imageUrl: result.output[0],
    model: model,
    metadata: {
      seed: options.seed,
      steps: options.numInferenceSteps,
    },
  };
}

// ============================================
// APPROACH 2: Hugging Face Inference API
// ============================================
// Many community models available, including NSFW fine-tunes
// Models: runwayml/stable-diffusion-v1-5, CompVis/stable-diffusion-v1-4, etc.

export async function generateImageWithHuggingFace(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const HF_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
  
  if (!HF_API_TOKEN) {
    throw new Error('HUGGINGFACE_API_TOKEN environment variable is required');
  }

  // Popular NSFW-capable models:
  // - runwayml/stable-diffusion-v1-5
  // - CompVis/stable-diffusion-v1-4
  // - Stability-AI/sdxl-turbo
  // Note: Many community fine-tunes available on Hugging Face Hub
  const model = process.env.HF_MODEL || "runwayml/stable-diffusion-v1-5";

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: options.prompt,
        parameters: {
          negative_prompt: options.negativePrompt,
          width: options.width || 512,
          height: options.height || 512,
          num_inference_steps: options.numInferenceSteps || 20,
          guidance_scale: options.guidanceScale || 7.5,
          seed: options.seed,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Hugging Face API error: ${error}`);
  }

  const imageBlob = await response.blob();
  
  // Convert blob to data URL or upload to your storage
  // For production, you'd want to upload to S3/Cloudflare R2/etc.
  const arrayBuffer = await imageBlob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const imageUrl = `data:image/png;base64,${base64}`;

  return {
    imageUrl,
    model: model,
    metadata: {
      seed: options.seed,
      steps: options.numInferenceSteps,
    },
  };
}

// ============================================
// APPROACH 3: Self-Hosted with Ollama
// ============================================
// Run models locally or on your own server
// Models: flux, stable-diffusion (via community ports)

export async function generateImageWithOllama(
  options: ImageGenerationOptions,
  baseUrl: string = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
): Promise<ImageGenerationResult> {
  // Note: Ollama primarily supports text models, but some community solutions
  // use Ollama as a backend for image generation workflows
  // For direct image generation, you'd typically use a Python API wrapper
  
  const model = process.env.OLLAMA_MODEL || "flux";
  
  // This is a simplified example - actual implementation would depend
  // on your Ollama setup and whether you're using it with ComfyUI/Stable Diffusion
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      prompt: options.prompt,
      // Ollama image generation parameters would go here
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  // Handle streaming response if needed
  const result = await response.json();
  
  return {
    imageUrl: result.imageUrl || "", // Adjust based on your setup
    model: model,
  };
}

// ============================================
// APPROACH 4: Self-Hosted ComfyUI API
// ============================================
// ComfyUI is a powerful UI/API for running Stable Diffusion locally
// Supports all Stable Diffusion models including NSFW fine-tunes

export async function generateImageWithComfyUI(
  options: ImageGenerationOptions,
  baseUrl: string = process.env.COMFYUI_BASE_URL || "http://localhost:8188"
): Promise<ImageGenerationResult> {
  // ComfyUI uses a workflow-based API
  // You'd need to construct a workflow JSON that defines the image generation pipeline
  
  const workflow = {
    // Simplified workflow structure - actual ComfyUI workflows are more complex
    // You'd load a workflow JSON that includes:
    // - Load Checkpoint (model)
    // - CLIP Text Encode (prompt encoding)
    // - KSampler (image generation)
    // - Save Image (output)
    prompt: options.prompt,
    negative_prompt: options.negativePrompt,
    width: options.width || 1024,
    height: options.height || 1024,
    steps: options.numInferenceSteps || 30,
    cfg_scale: options.guidanceScale || 7.5,
    seed: options.seed,
  };

  // Submit workflow
  const submitResponse = await fetch(`${baseUrl}/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!submitResponse.ok) {
    throw new Error(`ComfyUI API error: ${submitResponse.statusText}`);
  }

  const { prompt_id } = await submitResponse.json();

  // Poll for result
  let imageUrl = "";
  let attempts = 0;
  while (!imageUrl && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const historyResponse = await fetch(
      `${baseUrl}/history/${prompt_id}`
    );
    const history = await historyResponse.json();
    
    if (history[prompt_id]?.outputs) {
      const outputs = history[prompt_id].outputs;
      const imageNode = Object.values(outputs)[0] as any;
      if (imageNode?.images?.[0]) {
        imageUrl = `${baseUrl}/view?filename=${imageNode.images[0].filename}&subfolder=${imageNode.images[0].subfolder}&type=${imageNode.images[0].type}`;
        break;
      }
    }
    attempts++;
  }

  if (!imageUrl) {
    throw new Error("Image generation timeout");
  }

  return {
    imageUrl,
    model: "ComfyUI",
    metadata: {
      seed: options.seed,
      steps: options.numInferenceSteps,
    },
  };
}

// ============================================
// Unified Image Generation Function
// ============================================

export type ImageProvider = "replicate" | "huggingface" | "ollama" | "comfyui";

export async function generateImage(
  options: ImageGenerationOptions,
  provider: ImageProvider = (process.env.IMAGE_GENERATION_PROVIDER as ImageProvider) || "replicate"
): Promise<ImageGenerationResult> {
  console.log(`[Image Generation] Using provider: ${provider}`);

  switch (provider) {
    case "replicate":
      return generateImageWithReplicate(options);
    case "huggingface":
      return generateImageWithHuggingFace(options);
    case "ollama":
      return generateImageWithOllama(options);
    case "comfyui":
      return generateImageWithComfyUI(options);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// ============================================
// Helper: Upload Image to Storage
// ============================================
// For production, you'll want to upload generated images to cloud storage
// instead of returning data URLs or local URLs

export async function uploadImageToStorage(
  imageUrl: string,
  filename?: string
): Promise<string> {
  // Example implementation - adjust based on your storage provider
  // (S3, Cloudflare R2, Cloudinary, etc.)
  
  // For now, return the original URL
  // In production, you'd:
  // 1. Fetch the image from the generation service
  // 2. Upload to your storage provider
  // 3. Return the public URL
  
  return imageUrl;
}
