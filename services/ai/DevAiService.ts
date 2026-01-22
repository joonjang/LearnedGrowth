import {
   AbcAiService,
   AbcInput,
   AiSource,
   LEARNED_GROWTH_CATEGORIES, // Ensure this is exported from your model file
   LearnedGrowthResult,
   normalizeLearnedGrowthResponse,
} from '@/models/aiService';

// Simple fixture-backed service that generates dynamic responses for local dev/testing.
export class DevAiService implements AbcAiService {
   mode: AiSource = 'dev';

   async ready(): Promise<boolean> {
      return true;
   }

   /**
    * Generates a fresh response on the fly.
    * - Randomizes Category.
    * - Generates a score (0-10) and ensures dimension scores match that "mood".
    * - Injects current timestamp for debugging.
    */
   private generateDynamicResponse(input: AbcInput) {
      const timestamp = new Date().toLocaleTimeString();

      // 1. Randomize Category
      const randomCatIndex = Math.floor(
         Math.random() * LEARNED_GROWTH_CATEGORIES.length,
      );
      const category = LEARNED_GROWTH_CATEGORIES[randomCatIndex];

      // 2. Randomize Score (0-10)
      const optimismScore = Math.floor(Math.random() * 11); // 0 to 10 inclusive

      // 3. Derive Consistent Dimension Scores based on the Optimism Score
      // This ensures your UI "Detected Tone" matches the "Thinking Pattern" data
      let dimensionPool = ['mixed', 'mixed', 'mixed'];

      if (optimismScore >= 8) {
         // Highly Optimistic: mostly optimistic
         dimensionPool = ['optimistic', 'optimistic', 'mixed'];
      } else if (optimismScore >= 6) {
         // Moderately Optimistic
         dimensionPool = ['optimistic', 'mixed', 'mixed'];
      } else if (optimismScore <= 2) {
         // Highly Pessimistic
         dimensionPool = ['pessimistic', 'pessimistic', 'mixed'];
      } else if (optimismScore <= 4) {
         // Moderately Pessimistic
         dimensionPool = ['pessimistic', 'mixed', 'mixed'];
      }

      // Shuffle the derived pool so the dimensions aren't always in the same order
      const scores = dimensionPool.sort(() => Math.random() - 0.5);

      // 4. Build the JSON structure
      const rawResponse = {
         safety: {
            isCrisis: false,
            crisisMessage: null,
         },
         meta: {
            category: category, // Random category
            tags: ['dev-test', 'randomized', category.toLowerCase()],
            sentimentScore: Math.floor(Math.random() * 10),
            optimismScore: optimismScore, // Consistent score
         },
         analysis: {
            dimensions: {
               permanence: {
                  score: scores[0],
                  detectedPhrase: 'dev_test_phrase_permanence',
                  insight: `(Permanence was ${scores[0]}). Random Cat: ${category}. Score: ${optimismScore}.`,
               },
               pervasiveness: {
                  score: scores[1],
                  detectedPhrase: 'dev_test_phrase_pervasiveness',
                  insight: `(Pervasiveness was ${scores[1]}). Input: "${input.adversity.substring(0, 10)}..."`,
               },
               personalization: {
                  score: scores[2],
                  detectedPhrase: 'dev_test_phrase_personalization',
                  insight: `(Personalization was ${scores[2]}). Generated at ${timestamp}.`,
               },
            },
            emotionalLogic: `[DEBUG: ${timestamp}] Score ${optimismScore} matches dimensions ${scores.join('/')}.`,
         },
         suggestions: {
            evidenceQuestion: `Evidence question for ${category}?`,
            alternativesQuestion: `Alternatives for score ${optimismScore}?`,
            usefulnessQuestion: `Usefulness check at ${timestamp}?`,
            counterBelief: `Counter belief for ${category} scenario.`,
         },
      };

      return rawResponse;
   }

   async getLearnedOptimismSupport(
      input: AbcInput,
      opts?: { signal?: AbortSignal; onChunk?: (partial: string) => void },
   ): Promise<LearnedGrowthResult> {
      const started = Date.now();

      // 1. Generate dynamic data
      const rawResponse = this.generateDynamicResponse(input);
      const data = normalizeLearnedGrowthResponse(rawResponse);

      // 2. Stream Emulation Settings
      const emulateStream =
         process.env.EXPO_PUBLIC_DEV_AI_STREAM_EMULATE === 'true';
      const chunkSize = Math.max(
         1,
         Number(process.env.EXPO_PUBLIC_DEV_AI_STREAM_CHUNK_SIZE ?? '140'),
      );
      const delayMs = Math.max(
         0,
         Number(process.env.EXPO_PUBLIC_DEV_AI_STREAM_DELAY_MS ?? '50'),
      );
      const initialDelayMs = Math.max(
         0,
         Number(process.env.EXPO_PUBLIC_DEV_AI_INITIAL_DELAY_MS ?? '500'),
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
