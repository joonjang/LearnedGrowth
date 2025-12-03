// models/abcAi.ts

export type AbcInput = {
  adversity: string;
  belief: string;
  consequence?: string;
};

export type PermanenceStyle = "permanent" | "temporary" | "mixed" | null;
export type PervasivenessStyle = "pervasive" | "specific" | "mixed" | null;
export type PersonalizationStyle = "personal" | "external" | "mixed" | null;

type StyleSection<T extends string | null> = {
  style: T;
  quote: string | null;
  comment: string | null;
};

export type LearnedGrowthResponse = {
  analysis: {
    restatedBelief: string | null;
    explanatoryStyle: {
      permanence: StyleSection<PermanenceStyle>;
      pervasiveness: StyleSection<PervasivenessStyle>;
      personalization: StyleSection<PersonalizationStyle>;
    };
    educationalSummary: string | null;
    safetyNotice: string | null;
  };
  aiDispute: {
    acknowledgement: string | null;
    evidenceAgainstBelief: string[];
    alternativeExplanations: string[];
    usefulnessReflection: string | null;
    alternativeBelief: string | null;
    encouragement: string | null;
    safetyNotice: string | null;
  };
  disputationScaffold: {
    exampleEvidenceFor: string | null;
    exampleEvidenceAgainst: string | null;
    exampleAlternatives: string | null;
    exampleUsefulness: string | null;
  };
};

export type AiSource = "cloud" | "local" | "offline";

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

  const ensureStringArray = (val: any) => {
    if (val === null || val === undefined) return [];
    if (Array.isArray(val) && val.every((v) => typeof v === "string")) return val;
    throw new AiError("invalid-response", "Expected string array");
  };

  const ensureStyle = <T extends string | null>(val: any, allowed: Set<T>): StyleSection<T> => {
    if (!val || typeof val !== "object") throw new AiError("invalid-response", "Missing style section");
    const style = val.style as T;
    if (!allowed.has(style)) throw new AiError("invalid-response", "Unexpected style value");
    return {
      style,
      quote: ensureStringOrNull(val.quote),
      comment: ensureStringOrNull(val.comment),
    };
  };

  const analysis = raw.analysis ?? {};
  const aiDispute = raw.aiDispute ?? {};
  const scaffold = raw.disputationScaffold ?? {};

  const permanenceAllowed = new Set<PermanenceStyle>(["permanent", "temporary", "mixed", null]);
  const pervasivenessAllowed = new Set<PervasivenessStyle>(["pervasive", "specific", "mixed", null]);
  const personalizationAllowed = new Set<PersonalizationStyle>(["personal", "external", "mixed", null]);

  return {
    analysis: {
      restatedBelief: ensureStringOrNull(analysis.restatedBelief),
      explanatoryStyle: {
        permanence: ensureStyle(analysis.explanatoryStyle?.permanence, permanenceAllowed),
        pervasiveness: ensureStyle(analysis.explanatoryStyle?.pervasiveness, pervasivenessAllowed),
        personalization: ensureStyle(analysis.explanatoryStyle?.personalization, personalizationAllowed),
      },
      educationalSummary: ensureStringOrNull(analysis.educationalSummary),
      safetyNotice: ensureStringOrNull(analysis.safetyNotice),
    },
    aiDispute: {
      acknowledgement: ensureStringOrNull(aiDispute.acknowledgement),
      evidenceAgainstBelief: ensureStringArray(aiDispute.evidenceAgainstBelief),
      alternativeExplanations: ensureStringArray(aiDispute.alternativeExplanations),
      usefulnessReflection: ensureStringOrNull(aiDispute.usefulnessReflection),
      alternativeBelief: ensureStringOrNull(aiDispute.alternativeBelief),
      encouragement: ensureStringOrNull(aiDispute.encouragement),
      safetyNotice: ensureStringOrNull(aiDispute.safetyNotice),
    },
    disputationScaffold: {
      exampleEvidenceFor: ensureStringOrNull(scaffold.exampleEvidenceFor),
      exampleEvidenceAgainst: ensureStringOrNull(scaffold.exampleEvidenceAgainst),
      exampleAlternatives: ensureStringOrNull(scaffold.exampleAlternatives),
      exampleUsefulness: ensureStringOrNull(scaffold.exampleUsefulness),
    },
  };
}

// This is the contract everything else will code against.
export interface AbcAiService {
  mode: AiSource;
  ready(): Promise<boolean>;
  getLearnedOptimismSupport(
    input: AbcInput,
    opts?: { signal?: AbortSignal }
  ): Promise<LearnedGrowthResult>;
}
