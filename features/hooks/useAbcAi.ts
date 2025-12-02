// features/hooks/useAbcAi.ts
import { useEffect, useState } from "react";

import { createAbcAiService } from "@/services/ai/createAbcAiService";
import { AbcAiService, LearnedGrowthResponse, AbcInput } from "@/models/aiService";

export function useAbcAi() {
  const [service, setService] = useState<AbcAiService | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<LearnedGrowthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const svc = await createAbcAiService();
        if (!cancelled) setService(svc);
      } catch (e) {
        console.error(e);
        if (!cancelled) setInitError("Unable to initialize AI helper.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function analyze(input: AbcInput) {
    if (!service) throw new Error("AI service not ready");
    setLoading(true);
    setInitError(null);

    try {
      const result = await service.getLearnedOptimismSupport(input);
      setLastResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }

  return {
    analyze,
    lastResult,
    loading,
    initError,
    ready: !!service && !initError,
  };
}
