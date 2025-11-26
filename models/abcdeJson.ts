export interface AbcdeJson {
   adversity: string[];
   belief: string[];
   consequence: string[];
   dispute: {
      evidence: string[];
      alternatives: string[];
      usefulness: string[];
   };
   energy: string[];
}
