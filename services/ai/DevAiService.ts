import {
  AbcAiService,
  AbcInput,
  AiSource,
  LearnedGrowthResult,
  normalizeLearnedGrowthResponse,
} from "@/models/aiService";

// Simple fixture-backed service that generates dynamic responses for local dev/testing.
export class DevAiService implements AbcAiService {
  mode: AiSource = "dev";

  async ready(): Promise<boolean> {
    return true;
  }

  /**
   * Generates a fresh response on the fly.
   * - Shuffles "optimistic", "mixed", "pessimistic" across the 3 dimensions.
   * - Injects current timestamp for debugging.
   */
  private generateDynamicResponse(input: AbcInput) {
    const timestamp = new Date().toLocaleTimeString();
    
    // 1. Shuffle the scores so we get one of each distributed randomly
    const scores = ['optimistic', 'mixed', 'pessimistic'].sort(() => Math.random() - 0.5);
    
    // 2. Build the JSON structure
    const rawResponse = {
       "safety": {
          "isCrisis": false,
          "crisisMessage": null
       },
       "meta": {
          "category": "Development",
          "tags": ["dev-test", "randomized"],
          "sentimentScore": 5,
          "optimismScore": Math.floor(Math.random() * 10) // Random score 0-10
       },
       "analysis": {
          "dimensions": {
             "permanence": {
                "score": scores[0],
                "detectedPhrase": "dev_test_phrase_permanence",
                "insight": `(Permanence was ${scores[0]}). This insight was generated at ${timestamp}.`
             },
             "pervasiveness": {
                "score": scores[1],
                "detectedPhrase": "dev_test_phrase_pervasiveness",
                "insight": `(Pervasiveness was ${scores[1]}). The user input was: "${input.adversity.substring(0, 15)}..."`
             },
             "personalization": {
                "score": scores[2],
                "detectedPhrase": "dev_test_phrase_personalization",
                "insight": `(Personalization was ${scores[2]}). Random variety ensures UI testing covers all pill colors.`
             }
          },
          // 3. Inject Time here for visibility
          "emotionalLogic": `[DEBUG: ${timestamp}] It makes sense to feel frustrated. This response is fresh.`
       },
       "suggestions": {
          "evidenceQuestion": "Can you see the timestamp updated in the emotional logic section?",
          "alternativesQuestion": "What happens if you refresh the AI insight again?",
          "usefulnessQuestion": "How does this layout handle mixed vs optimistic colors?",
          "counterBelief": `I can verify my dev changes because the time is currently ${timestamp}.`
       }
    };

    return rawResponse;
  }

  async getLearnedOptimismSupport(
    input: AbcInput,
    opts?: { signal?: AbortSignal; onChunk?: (partial: string) => void }
  ): Promise<LearnedGrowthResult> {
    const started = Date.now();

    // 1. Generate dynamic data instead of loading a file
    const rawResponse = this.generateDynamicResponse(input);
    const data = normalizeLearnedGrowthResponse(rawResponse);

    // 2. Stream Emulation Settings
    const emulateStream =
      process.env.EXPO_PUBLIC_DEV_AI_STREAM_EMULATE === "true";
    const chunkSize = Math.max(
      1,
      Number(process.env.EXPO_PUBLIC_DEV_AI_STREAM_CHUNK_SIZE ?? "140")
    );
    const delayMs = Math.max(
      0,
      Number(process.env.EXPO_PUBLIC_DEV_AI_STREAM_DELAY_MS ?? "50")
    );
    const initialDelayMs = Math.max(
      0,
      Number(process.env.EXPO_PUBLIC_DEV_AI_INITIAL_DELAY_MS ?? "500")
    );

    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    if (initialDelayMs > 0) {
      await delay(initialDelayMs);
    }

    const emitChunk = (payload: string) => {
      if (opts?.onChunk) opts.onChunk(payload);
    };

    if (opts?.onChunk) {
      const payload = JSON.stringify(data);
      if (emulateStream && payload.length > chunkSize) {
        for (let i = chunkSize; i < payload.length; i += chunkSize) {
          emitChunk(payload.slice(0, i));
          if (delayMs > 0) await delay(delayMs);
        }
      }
    }

    // Stamp completion time so "fresh" animations still play
    data.createdAt = new Date().toISOString();
    emitChunk(JSON.stringify(data));

    return {
      data,
      meta: {
        source: this.mode,
        model: `dev-dynamic-random`,
        latencyMs: Date.now() - started,
      },
    };
  }
}