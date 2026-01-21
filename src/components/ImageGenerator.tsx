"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Image as ImageIcon, AlertCircle } from "lucide-react";

interface ImageGenerationResult {
  success: boolean;
  imageUrl: string;
  model: string;
  metadata?: {
    seed?: number;
    steps?: number;
    generationTime?: number;
  };
  error?: string;
}

export function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [provider, setProvider] = useState<"replicate" | "huggingface" | "ollama" | "comfyui">("replicate");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          negativePrompt: negativePrompt || undefined,
          provider,
          width,
          height,
          numInferenceSteps: 30,
          guidanceScale: 7.5,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Image generation failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate image");
      console.error("Image generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            AI Image Generator
          </CardTitle>
          <CardDescription>
            Generate images using open-source models (NSFW-capable)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={(value: any) => setProvider(value)}>
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replicate">Replicate API (Recommended)</SelectItem>
                <SelectItem value="huggingface">Hugging Face API</SelectItem>
                <SelectItem value="ollama">Ollama (Self-Hosted)</SelectItem>
                <SelectItem value="comfyui">ComfyUI (Self-Hosted)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Enter a detailed description of the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
            <Textarea
              id="negativePrompt"
              placeholder="What to avoid in the image (e.g., blurry, low quality, distorted)..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                min={256}
                max={2048}
                step={64}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                min={256}
                max={2048}
                step={64}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-green-700 dark:text-green-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Generate Image
              </>
            )}
          </Button>

          {/* Result */}
          {result && result.success && (
            <div className="space-y-4 mt-6">
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={result.imageUrl}
                  alt={prompt}
                  className="w-full h-auto"
                  onError={() => setError("Failed to load generated image")}
                />
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Model:</strong> {result.model}</p>
                {result.metadata?.seed && (
                  <p><strong>Seed:</strong> {result.metadata.seed}</p>
                )}
                {result.metadata?.steps && (
                  <p><strong>Steps:</strong> {result.metadata.steps}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
