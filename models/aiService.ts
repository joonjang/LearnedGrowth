// models/abcAi.ts

export type AbcInput = {
  adversity: string;
  belief: string;
  consequence?: string;
};

export type ExplanatoryStyleDimension =
  | "permanent"
  | "temporary"
  | "mixed"
  | "pervasive"
  | "specific"
  | "personal"
  | "external"
  | null;

export type LearnedGrowthResponse = {
  analysis: {
    restatedBelief: string | null;
    explanatoryStyle: {
      permanence: {
        style: ExplanatoryStyleDimension;
        quote: string | null;
        comment: string | null;
      };
      pervasiveness: {
        style: ExplanatoryStyleDimension;
        quote: string | null;
        comment: string | null;
      };
      personalization: {
        style: ExplanatoryStyleDimension;
        quote: string | null;
        comment: string | null;
      };
    };
    educationalSummary: string | null;
    safetyNotice: string | null;
  };
  aiDispute: {
    acknowledgement: string | null;
    evidenceAgainstBelief: string[] | null;
    alternativeExplanations: string[] | null;
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

// This is the contract everything else will code against.
export interface AbcAiService {
  getLearnedOptimismSupport(input: AbcInput): Promise<LearnedGrowthResponse>;
}
