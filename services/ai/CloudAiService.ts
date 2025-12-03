import {
  AbcAiService,
  AbcInput,
  AiError,
  AiSource,
  LearnedGrowthResult,
  normalizeLearnedGrowthResponse,
} from "@/models/aiService";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export class CloudAiService implements AbcAiService {
  mode: AiSource = "cloud";

  async ready(): Promise<boolean> {
    return !!BASE_URL;
  }

  async getLearnedOptimismSupport(
    input: AbcInput,
    opts?: { signal?: AbortSignal }
  ): Promise<LearnedGrowthResult> {
    if (!BASE_URL) {
      throw new AiError("config", "EXPO_PUBLIC_API_BASE_URL is not set");
    }

    const started = Date.now();
    const res = await fetch(`${BASE_URL}/ai/learned-growth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: opts?.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      const detail = text ? ` - ${text.slice(0, 140)}` : "";
      throw new AiError("http", `Cloud AI error: ${res.status}${detail}`, res.status);
    }

    const json = await res.json();
    const data = normalizeLearnedGrowthResponse(json);

    return {
      data,
      meta: { source: this.mode, latencyMs: Date.now() - started },
    };
  }
}
