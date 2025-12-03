// features/hooks/useAbcAi.ts
import { useEffect, useState } from "react";

import { createAbcAiService } from "@/services/ai/createAbcAiService";
import { AbcAiService, LearnedGrowthResult, AbcInput } from "@/models/aiService";

export function useAbcAi() {
  const [service, setService] = useState<AbcAiService | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<LearnedGrowthResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const svc = await createAbcAiService();
        const isReady = await svc.ready();
        if (cancelled) return;
        if (!isReady) {
          setInitError("AI helper is not ready.");
          return;
        }
        setService(svc);
        setReady(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Unable to initialize AI helper.";
          setInitError(message);
        }
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
    setLastError(null);

    try {
      const result = await service.getLearnedOptimismSupport(input);
      setLastResult(result);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "AI request failed";
      setLastError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return {
    analyze,
    lastResult,
    loading,
    initError,
    error: lastError,
    ready: ready && !!service && !initError,
  };
}
