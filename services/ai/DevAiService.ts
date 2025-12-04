import devAbcOptimistic from "@/assets/data/devAbcOptimistic.json";
import devAbcPessimistic from "@/assets/data/devAbcPessimistic.json";
import {
  AbcAiService,
  AbcInput,
  AiSource,
  LearnedGrowthResult,
  normalizeLearnedGrowthResponse,
} from "@/models/aiService";

// Simple fixture-backed service that returns a canned response for local dev/testing.
export class DevAiService implements AbcAiService {
  mode: AiSource = "dev";

  async ready(): Promise<boolean> {
    return true;
  }

  /**
   * Pick a fixture based on .env.
   * - EXPO_PUBLIC_DEV_AI_RESPONSE_FILE / EXPO_PUBLIC_DEV_AI_RESPONSE_FIXTURE /
   *   EXPO_PUBLIC_DEV_AI_RESPONSE can be set to a filename ("devAbcOptimistic.json")
   *   or a short key ("optimistic", "pessimistic").
   * - Defaults to the optimistic sample.
   *
   * NOTE: Metro needs static imports for assets. To add a new JSON fixture, import
   * it above and register it in the fixture map below.
   */
  private pickFixture() {
    const envFixture =
      process.env.EXPO_PUBLIC_DEV_AI_RESPONSE_FILE ??
      "";

    const normalized = envFixture.trim().replace(/\.json$/i, "").toLowerCase();

    const fixtureMap: Record<string, any> = {
      devabcoptimistic: devAbcOptimistic,
      devabcpessimistic: devAbcPessimistic,
    };

    const key = normalized && fixtureMap[normalized] ? normalized : "optimistic";
    const raw = fixtureMap[key] ?? devAbcOptimistic;
    const response = raw.output ?? raw;

    return { key, response };
  }

  async getLearnedOptimismSupport(
    input: AbcInput,
    opts?: { signal?: AbortSignal; onChunk?: (partial: string) => void }
  ): Promise<LearnedGrowthResult> {
    const { key, response } = this.pickFixture();
    const data = normalizeLearnedGrowthResponse(response);
    opts?.onChunk?.(JSON.stringify(data));

    return {
      data,
      meta: {
        source: this.mode,
        model: `dev-fixture:${key}`,
        latencyMs: 0,
      },
    };
  }
}
