import { useCallback, useRef } from "react";
import { useChatStore } from "@/stores/chatStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TextGenerationPipeline = any;

export function useModelLoader() {
  const generatorRef = useRef<TextGenerationPipeline | null>(null);
  const loadingRef = useRef(false);

  const { setModelStatus, setModelLoadProgress, setModelError } = useChatStore();

  const loadModel = useCallback(async () => {
    // Prevent double loading
    if (loadingRef.current || generatorRef.current) {
      return generatorRef.current;
    }

    loadingRef.current = true;
    setModelStatus("loading");
    setModelLoadProgress(0);

    try {
      // Dynamic import to avoid bundling issues
      const { pipeline, env } = await import("@xenova/transformers");

      // Configure transformers.js
      env.allowLocalModels = true;
      env.useBrowserCache = true;

      // Load the model with progress callback
      // Using type assertion as transformers.js types are complex
      const generator = await pipeline("text-generation", "HuggingFaceTB/SmolLM2-135M-Instruct", {
        progress_callback: (progress: { progress: number; status: string }) => {
          if (progress.progress) {
            setModelLoadProgress(Math.round(progress.progress));
          }
        },
        dtype: "q4f16", // Use quantized version for smaller size
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      generatorRef.current = generator;
      setModelStatus("ready");
      setModelLoadProgress(100);

      return generator;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load AI model";
      console.error("Failed to load AI model:", error);
      setModelError(errorMessage);
      loadingRef.current = false;
      return null;
    }
  }, [setModelStatus, setModelLoadProgress, setModelError]);

  const generate = useCallback(
    async (prompt: string, maxTokens: number = 150): Promise<string | null> => {
      const generator = generatorRef.current;
      if (!generator) {
        console.warn("Model not loaded");
        return null;
      }

      try {
        const result = await generator(prompt, {
          max_new_tokens: maxTokens,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9,
        });

        // Extract generated text
        if (Array.isArray(result) && result.length > 0) {
          const generated = result[0] as { generated_text: string };
          // Remove the original prompt from the response
          const response = generated.generated_text.slice(prompt.length).trim();
          return response;
        }

        return null;
      } catch (error) {
        console.error("Generation error:", error);
        return null;
      }
    },
    []
  );

  const isReady = useCallback(() => {
    return generatorRef.current !== null;
  }, []);

  return {
    loadModel,
    generate,
    isReady,
  };
}
