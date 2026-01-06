export const AI_INSIGHT_ANIMATION = {
   timeline: {
      baseStagger: 75,
      emotionAppearDelay: 500,
      headerAppearDelay: 800,
      timeStartDelay: 1000,
      rowDuration: 3900,
      blameGap: 500,
      suggestionOffset: 3600,
      disclaimerDelayOffset: 200,
   },
   spectrum: {
      revealSkipDuration: 600,
      scanDelayOffset: 600,
      swipeSpeed: 800,
      hapticInterval: 150,
      impactShrinkDuration: 150,
      impactSpring: { damping: 15, stiffness: 150 },
      revealDelayAfterFinish: 300,
      revealAfterFinishDuration: 800,
      noMoveDelay: 50,
      phraseEntryDuration: 600,
      pillsEntryOffset: 400,
      pillsEntryDuration: 500,
   },
};

export const getAiInsightAnimationTimeline = (isFresh: boolean) => {
   const timeline = AI_INSIGHT_ANIMATION.timeline;
   const baseStagger = timeline.baseStagger;
   const emotionAppear = isFresh ? timeline.emotionAppearDelay : 0;
   const headerAppear = isFresh ? timeline.headerAppearDelay : baseStagger;
   const timeStart = isFresh ? timeline.timeStartDelay : baseStagger * 2;
   const rowDuration = isFresh ? timeline.rowDuration : 0;
   const scopeStart = timeStart + rowDuration + (isFresh ? 0 : baseStagger);
   const blameStart =
      scopeStart + rowDuration + (isFresh ? timeline.blameGap : baseStagger);
   const suggestionStart =
      blameStart + (isFresh ? timeline.suggestionOffset : baseStagger);
   const disclaimerStart = suggestionStart + timeline.disclaimerDelayOffset;

   return {
      emotionAppear,
      headerAppear,
      timeStart,
      scopeStart,
      blameStart,
      suggestionStart,
      disclaimerStart,
   };
};

export type AnimationTimeline = ReturnType<typeof getAiInsightAnimationTimeline>;
