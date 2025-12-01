export type AbcdeInput = {
  adversity: string;
  belief: string;
  consequence?: string;
};

export type ThinkingPattern = {
  label: string;       // e.g. "Catastrophizing", "Global labeling"
  quote: string;       // exact snippet from the belief, like "I will never find a job"
  explanation: string; // short explanation why this pattern is unhelpful
};

export type AnalyzeBeliefResult = {
  restatedBelief: string;
  thinkingPatterns: ThinkingPattern[];
  educationalSummary: string;
};

export type DisputeBeliefResult = {
  acknowledgement: string;   // validates feelings
  disputes: string[];        // bullet-style counterpoints
  alternativeBelief: string; // single, realistic reframe
  encouragement: string;     // short hopeful closing
};

