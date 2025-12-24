// models/abcAi.ts

export type AbcInput = {
  adversity: string;
  belief: string;
  consequence?: string;
};

export type DimensionScore = string | null; // e.g., "optimistic", "pessimistic", etc.

export type ExplanatoryDimension = {
  score: DimensionScore;
  detectedPhrase: string | null;
  insight: string | null;
};

export type LearnedGrowthResponse = {
  isStale?: boolean;
  createdAt?: string;
  safety: {
    isCrisis: boolean;
    crisisMessage: string | null;
  };
  analysis: {
    dimensions: {
      permanence: ExplanatoryDimension;
      pervasiveness: ExplanatoryDimension;
      personalization: ExplanatoryDimension;
    };
    emotionalLogic: string | null;
  };
  suggestions: {
    evidenceQuestion: string | null;
    alternativesQuestion: string | null;
    usefulnessQuestion: string | null;
    counterBelief: string | null;
  };
};

export type AiSource = "cloud" | "local" | "offline" | "dev";

export type LearnedGrowthResult = {
  data: LearnedGrowthResponse;
  meta: {
    source: AiSource;
    latencyMs?: number;
    model?: string;
    warnings?: string[];
  };
};

export class AiError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "AiError";
  }
}

// Normalize nullable array fields so the UI has a stable contract.
export function normalizeLearnedGrowthResponse(raw: any): LearnedGrowthResponse {
  if (!raw || typeof raw !== "object") {
    throw new AiError("invalid-response", "AI response was not an object");
  }

  const ensureStringOrNull = (val: any) => {
    if (typeof val === "string" || val === null) return val;
    throw new AiError("invalid-response", "Expected string or null");
  };

  const ensureBoolean = (val: any) => {
    if (typeof val === "boolean") return val;
    if (val === undefined || val === null) return false;
    throw new AiError("invalid-response", "Expected boolean");
  };

  const ensureDimension = (val: any): ExplanatoryDimension => {
    if (!val || typeof val !== "object") {
      throw new AiError("invalid-response", "Missing dimension");
    }
    return {
      score: ensureStringOrNull(val.score),
      detectedPhrase: ensureStringOrNull(val.detectedPhrase),
      insight: ensureStringOrNull(val.insight),
    };
  };

  const analysis = raw.analysis ?? {};
  const suggestions = raw.suggestions ?? {};
  const safety = raw.safety ?? {};
  const createdAt = new Date().toISOString();

  return {
    createdAt,
    safety: {
      isCrisis: ensureBoolean(safety.isCrisis),
      crisisMessage: ensureStringOrNull(safety.crisisMessage),
    },
    analysis: {
      dimensions: {
        permanence: ensureDimension(analysis.dimensions?.permanence),
        pervasiveness: ensureDimension(analysis.dimensions?.pervasiveness),
        personalization: ensureDimension(analysis.dimensions?.personalization),
      },
      emotionalLogic: ensureStringOrNull(analysis.emotionalLogic),
    },
    suggestions: {
      evidenceQuestion: ensureStringOrNull(suggestions.evidenceQuestion),
      alternativesQuestion: ensureStringOrNull(suggestions.alternativesQuestion),
      usefulnessQuestion: ensureStringOrNull(suggestions.usefulnessQuestion),
      counterBelief: ensureStringOrNull(suggestions.counterBelief),
    },
  };
}

// This is the contract everything else will code against.
export interface AbcAiService {
  mode: AiSource;
  ready(): Promise<boolean>;
  getLearnedOptimismSupport(
    input: AbcInput,
    opts?: { signal?: AbortSignal; onChunk?: (partial: string) => void }
  ): Promise<LearnedGrowthResult>;
}
