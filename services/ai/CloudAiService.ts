import { AbcAiService, AbcInput, LearnedGrowthResponse } from "@/models/aiService";


const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!; 

export class CloudAiService implements AbcAiService {
  async getLearnedOptimismSupport(input: AbcInput): Promise<LearnedGrowthResponse> {
    const res = await fetch(`${BASE_URL}/ai/learned-growth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloud AI error: ${res.status} ${text}`);
    }

    // TODO: runtime validation here
    return res.json() as Promise<LearnedGrowthResponse>;
  }
}
