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
    // optional: surface a warning if the input differs from the fixture
    const mismatched =
      input.adversity?.trim() !== devInput.adversity?.trim() ||
      input.belief?.trim() !== devInput.belief?.trim() ||
      (input.consequence ?? "").trim() !== (devInput.consequence ?? "").trim();

    const data = normalizeLearnedGrowthResponse(devResponse);
    opts?.onChunk?.(JSON.stringify(data));

    return {
      data,
      meta: {
        source: this.mode,
        model: "dev-fixture",
        warnings: mismatched ? ["Input differs from devAbcInput.json"] : undefined,
        latencyMs: 0,
      },
    };
  }
}
