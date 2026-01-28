import React from 'react';
import { View } from 'react-native';

import { LearnedGrowthResponse } from '@/models/aiService';
import { AnimationTimeline } from './animation';
import {
   AiInsightCrisisBanner,
   AiInsightDisclaimer,
   AiInsightEmotionalValidation,
   AiInsightStaleBanner,
   AiInsightSuggestion,
   AiInsightThinkingPatterns,
} from './sections';
import { useCooldownLabel } from './useCooldownLabel';

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

type Props = {
   data: NonNullable<LearnedGrowthResponse>;
   isStale: boolean;
   isCoolingDown: boolean;
   isNudgeStep: boolean;
   refreshCostNote: string | null;
   onRefresh?: () => void;
   onRefreshPress: () => void;
   cooldownAnchorMs: number;
   isDark: boolean;
   animationTimeline: AnimationTimeline;
   showDefinitions: boolean;
   toggleHelp: () => void;
   allowMinimize: boolean;
   toggleMinimized: () => void;
   isFreshAnalysis: boolean;
   onAnimationComplete?: () => void;
};

// ----------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------

export default function AiInsightExpandedContent({
   data,
   isStale,
   isCoolingDown,
   isNudgeStep,
   refreshCostNote,
   onRefresh,
   onRefreshPress,
   cooldownAnchorMs,
   isDark,
   animationTimeline,
   showDefinitions,
   toggleHelp,
   allowMinimize,
   toggleMinimized,
   isFreshAnalysis,
   onAnimationComplete,
}: Props) {
   const safety = data.safety;
   const analysis = data.analysis;
   const suggestions = data.suggestions;
   const dims = analysis?.dimensions;
   const emotionalLogic = analysis?.emotionalLogic;

   // Re-hydrate date from timestamp for the hook
   const cooldownAnchor = new Date(cooldownAnchorMs);
   const timeLabel = useCooldownLabel(isCoolingDown, cooldownAnchor, 2);

   return (
      <View className="gap-6 pt-1">
         <AiInsightStaleBanner
            isStale={isStale}
            isCoolingDown={isCoolingDown}
            isNudgeStep={isNudgeStep}
            refreshCostNote={refreshCostNote}
            onRefreshPress={onRefreshPress}
            timeLabel={timeLabel}
            isDark={isDark}
         />

         <AiInsightCrisisBanner safety={safety} isDark={isDark} />

         <AiInsightEmotionalValidation
            emotionalLogic={emotionalLogic}
            animationTimeline={animationTimeline}
         />

         <AiInsightThinkingPatterns
            dims={dims}
            animationTimeline={animationTimeline}
            isFreshAnalysis={isFreshAnalysis}
            isDark={isDark}
         />

         <AiInsightSuggestion
            counterBelief={suggestions?.counterBelief}
            animationTimeline={animationTimeline}
         />

         <AiInsightDisclaimer
            allowMinimize={allowMinimize}
            toggleMinimized={toggleMinimized}
            animationTimeline={animationTimeline}
            isDark={isDark}
            onAnimationComplete={onAnimationComplete}
         />
      </View>
   );
}
