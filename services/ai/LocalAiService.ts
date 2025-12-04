import {
  AbcAiService,
  AbcInput,
  AiError,
  AiSource,
  LearnedGrowthResult,
  normalizeLearnedGrowthResponse,
} from "@/models/aiService";

type LocalModelRunner = (
  input: AbcInput,
  opts?: { signal?: AbortSignal }
) => Promise<any>;

// Placeholder local implementation; wire your on-device model into `runner`.
export class LocalAiService implements AbcAiService {
  mode: AiSource = "local";

  constructor(private readonly runner?: LocalModelRunner) {}

  async ready(): Promise<boolean> {
    return !!this.runner;
  }

  async getLearnedOptimismSupport(
    input: AbcInput,
    opts?: { signal?: AbortSignal; onChunk?: (partial: string) => void }
  ): Promise<LearnedGrowthResult> {
    if (!this.runner) {
      throw new AiError("local-unavailable", "Local AI model is not ready");
    }

    const started = Date.now();
    const raw = await this.runner(input, opts);
    const data = normalizeLearnedGrowthResponse(raw);
    opts?.onChunk?.(JSON.stringify(data));

    return {
      data,
      meta: { source: this.mode, latencyMs: Date.now() - started },
    };
  }
}
