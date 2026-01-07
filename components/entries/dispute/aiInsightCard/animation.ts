export const AI_INSIGHT_ANIMATION = {
   timeline: {
      baseStagger: 75,
      startDelay: 300,        // Start the whole sequence sooner
      headerGap: 300,         // Gap between Emotion and Section Header
      rowGap: 300,            // Gap between Section Header and First Row
      rowDuration: 5400,      // Time for one row to finish scanning
      suggestionGap: 0,     // Gap after last row finishes before Suggestion appears
      disclaimerGap: 200,     // Gap between Suggestion and Disclaimer
   },
   spectrum: {
      revealSkipDuration: 600,
      scanDelayOffset: 500,
   },
};

export const getAiInsightAnimationTimeline = (isFresh: boolean) => {
   const t = AI_INSIGHT_ANIMATION.timeline;
   
   // 1. Emotional Validation (Top)
   const emotionAppear = isFresh ? t.startDelay : 0;

   // 2. Thinking Patterns Header (Below Emotion)
   const headerAppear = isFresh 
      ? emotionAppear + t.headerGap 
      : t.baseStagger;

   // 3. Row 1: Time (Below Header)
   const timeStart = isFresh 
      ? headerAppear + t.rowGap 
      : t.baseStagger * 2;

   // 4. Row 2: Scope (Waits for Row 1 to finish scan)
   const scopeStart = timeStart + (isFresh ? t.rowDuration : t.baseStagger);

   // 5. Row 3: Blame (Waits for Row 2 to finish scan)
   const blameStart = scopeStart + (isFresh ? t.rowDuration : t.baseStagger);

   // 6. Suggestion (Waits for Row 3 to finish scan)
   const suggestionStart = blameStart + (isFresh ? t.rowDuration + t.suggestionGap : t.baseStagger);

   // 7. Disclaimer (Bottom)
   const disclaimerStart = suggestionStart + (isFresh ? t.disclaimerGap : t.baseStagger);

   // Total time 
   const totalDuration = 8800;

   return {
      emotionAppear,
      headerAppear,
      timeStart,
      scopeStart,
      blameStart,
      suggestionStart,
      disclaimerStart,
      totalDuration
   };
};

export type AnimationTimeline = ReturnType<typeof getAiInsightAnimationTimeline>;