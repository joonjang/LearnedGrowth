import {
  AbcAiService,
  AbcInput,
  AiError,
  AiSource,
  LearnedGrowthResult,
} from "@/models/aiService";

export class OfflineAiService implements AbcAiService {
  mode: AiSource = "offline";

  async ready(): Promise<boolean> {
    return true;
  }

  async getLearnedOptimismSupport(
    _input: AbcInput,
    _opts?: { signal?: AbortSignal; onChunk?: (partial: string) => void }
  ): Promise<LearnedGrowthResult> {
    throw new AiError("offline", "AI is disabled in offline mode");
  }
}
