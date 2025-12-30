// models/abcAi.ts

export type AbcInput = {
  adversity: string;
  belief: string;
  consequence?: string;
};

export const LEARNED_GROWTH_CATEGORIES = [
  "Work",
  "Education",
  "Relationships",
  "Health",
  "Finance",
  "Self-Image",
  "Daily Hassles",
  "Other",
] as const;

export type LearnedGrowthCategory = (typeof LEARNED_GROWTH_CATEGORIES)[number];

export type DimensionScore = string | null; // e.g., "optimistic", "pessimistic", etc.

export type ExplanatoryDimension = {
  score: DimensionScore;
  detectedPhrase: string | null;
  insight: string | null;
};

export type LearnedGrowthMeta = {
  category: LearnedGrowthCategory | null;
  tags: string[];
  sentimentScore: number | null;
  optimismScore: number | null;
};

export type LearnedGrowthResponse = {
  isStale?: boolean;
  createdAt?: string;
  safety: {
    isCrisis: boolean;
    crisisMessage: string | null;
  };
  meta: LearnedGrowthMeta;
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

  const ensureNumberOrNull = (val: any): number | null => {
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string" && val.trim() !== "") {
      const parsed = Number(val);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const ensureCategoryOrNull = (val: any): LearnedGrowthCategory | null => {
    if (typeof val !== "string") return null;
    const normalized = val.trim() as LearnedGrowthCategory;
    return LEARNED_GROWTH_CATEGORIES.includes(normalized) ? normalized : null;
  };

  const ensureTags = (val: any): string[] => {
    if (!val) return [];
    if (!Array.isArray(val)) return [];
    return Array.from(
      new Set(
        val
          .map((tag: any) => (typeof tag === "string" ? tag.trim() : ""))
          .filter(Boolean)
      )
    );
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
  const meta = raw.meta ?? {};
  const createdAt = new Date().toISOString();

  return {
    createdAt,
    safety: {
      isCrisis: ensureBoolean(safety.isCrisis),
      crisisMessage: ensureStringOrNull(safety.crisisMessage),
    },
    meta: {
      category: ensureCategoryOrNull(meta.category),
      tags: ensureTags(meta.tags),
      sentimentScore: ensureNumberOrNull(meta.sentimentScore),
      optimismScore: ensureNumberOrNull(meta.optimismScore),
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
