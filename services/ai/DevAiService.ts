import devInput from "@/assets/data/devAbcInput.json";
import devResponse from "@/assets/data/devAbcResponse.json";
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

  async getLearnedOptimismSupport(
    input: AbcInput,
    opts?: { signal?: AbortSignal; onChunk?: (partial: string) => void }
  ): Promise<LearnedGrowthResult> {

    const data = normalizeLearnedGrowthResponse(devResponse);
    opts?.onChunk?.(JSON.stringify(data));

    return {
      data,
      meta: {
        source: this.mode,
        model: "dev-fixture",
        latencyMs: 0,
      },
    };
  }
}
