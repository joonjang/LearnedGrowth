import { PInsightCard } from '@/components/appInfo/PDefinitions';
import {
   BookOpen,
   ChevronDown,
   ChevronUp,
   Clock3,
   Hourglass,
   Info,
   Layers,
   Leaf,
   Quote,
   RefreshCw,
   TriangleAlert,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, {
   Easing,
   runOnJS,
   useAnimatedStyle,
   useSharedValue,
   withDelay,
   withTiming,
} from 'react-native-reanimated';

import { AnimatedSpectrumRow } from './AnimatedSpectrumRow';
import type { AnimationTimeline } from './animation';
import { InsightDimensions, InsightSafety } from './types';

// --- HELPER HOOK ---
// This replaces the 'entering' prop. It creates a simple fade-in style
// that runs on the UI thread without triggering layout changes.
function useDelayedAppearance(delay: number, onComplete?: () => void) {
   const opacity = useSharedValue(0);
   const translateY = useSharedValue(10); // Slight slide up

   useEffect(() => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }, 

         (finished) => {
            if (finished && onComplete) {
               runOnJS(onComplete)();
            }
         }
       ));
      translateY.value = withDelay(
         delay,
         withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
   }, [delay, onComplete, opacity, translateY]);

   return useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
   }));
}

// --- HEADER ---
export type AiInsightHeaderProps = {
   allowMinimize: boolean;
   isMinimized: boolean;
   isStale: boolean;
   textColor: string;
   descColor: string;
   iconColor: string;
   isDark: boolean;
};

export function AiInsightHeader({
   allowMinimize,
   isMinimized,
   isStale,
   textColor,
   descColor,
   iconColor,
   isDark,
}: AiInsightHeaderProps) {
   return (
      <>
         <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-2">
               <Text className={`text-base font-bold ${textColor}`}>
                  AI Analysis
               </Text>
               {isStale && isMinimized && (
                  <Clock3
                     size={14}
                     color={isDark ? '#94a3b8' : '#64748b'}
                     style={{ opacity: 0.8 }}
                  />
               )}
            </View>

            {allowMinimize && (
               <View className="rounded-full px-2 py-1">
                  <Quote size={14} color={iconColor} />
               </View>
            )}
         </View>

         {allowMinimize && isMinimized && (
            <Text
               className={`text-sm font-medium mb-3 opacity-80 ${descColor}`}
            >
               Observed thinking patterns.
            </Text>
         )}
      </>
   );
}

// --- ERROR & LOADING ---
export function AiInsightErrorState({ error }: { error: string }) {
   return (
      <View className="py-2">
         <Text className="text-sm font-medium text-red-600 dark:text-red-400">
            Unable to load analysis. {error}
         </Text>
      </View>
   );
}

export function AiInsightLoadingState({
   renderStreamingText,
}: {
   renderStreamingText?: string;
}) {
   return (
      <View className="py-2 opacity-70">
         <View className="flex-row items-center gap-3">
            <ActivityIndicator size="small" color="#6366f1" />
            <Text className="font-mono text-xs leading-5 text-indigo-900/70 dark:text-indigo-200/70 shrink">
               {renderStreamingText || 'Connecting to insight engine...'}
            </Text>
         </View>
      </View>
   );
}

export function AiInsightMinimizedState({
   previewText,
   isDark,
}: {
   previewText?: string | null;
   isDark: boolean;
}) {
   return (
      <View>
         <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
            Alternative perspective
         </Text>
         <Text className="text-sm italic leading-6 text-slate-600 dark:text-slate-400 opacity-90">
            &quot;{previewText}&quot;
         </Text>
         <View className="mt-2 items-center opacity-50">
            <ChevronDown size={16} color={isDark ? '#94a3b8' : '#64748b'} />
         </View>
      </View>
   );
}

// --- STALE BANNER ---
export type AiInsightStaleBannerProps = {
   isStale: boolean;
   isCoolingDown: boolean;
   isNudgeStep: boolean;
   refreshCostNote: string | null;
   onRefresh?: () => void;
   onRefreshPress: () => void;
   timeLabel: string;
   isDark: boolean;
};

export function AiInsightStaleBanner({
   isStale,
   isCoolingDown,
   isNudgeStep,
   refreshCostNote,
   onRefresh,
   onRefreshPress,
   timeLabel,
   isDark,
}: AiInsightStaleBannerProps) {
   if (!isStale) return null;

   const containerStyle = isCoolingDown
      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      : isNudgeStep
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';

   return (
      <View
         className={`flex-row justify-between p-3 rounded-lg border mb-2 ${containerStyle}`}
      >
         <View className="flex-1 mr-2">
            <View className="flex-row items-center justify-between">
               <View className="flex-row items-center gap-2">
                  {isCoolingDown ? (
                     <Hourglass
                        size={16}
                        color={isDark ? '#94a3b8' : '#64748b'}
                     />
                  ) : (
                     <Clock3 size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                  )}
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                     {isCoolingDown ? 'Analysis Paused' : 'Previous Analysis'}
                  </Text>
               </View>

               {!isCoolingDown && refreshCostNote && (
                  <View className="flex-row items-center opacity-90 ml-2">
                     <Leaf
                        size={10}
                        color={isDark ? '#f59e0b' : '#b45309'}
                        style={{ marginRight: 3 }}
                     />
                     <Text className="text-[10px] font-semibold text-amber-700 dark:text-amber-200">
                        {refreshCostNote}
                     </Text>
                  </View>
               )}
            </View>

            <Text className="text-[11px] text-slate-600 dark:text-slate-400 leading-4 mt-1">
               {!onRefresh
                  ? 'This insight is based on an older version of your entry.'
                  : isCoolingDown
                    ? 'Updates paused to enable deeper thinking.'
                    : isNudgeStep
                      ? "You've refined this quite a bit. Consider moving on to the next phase after refreshing."
                      : 'Entry has changed. Update analysis?'}
            </Text>
         </View>

         <View
            className={`justify-end pl-1 ${!isCoolingDown && refreshCostNote ? 'pt-5' : ''}`}
         >
            {onRefresh && !isCoolingDown ? (
               <Pressable
                  onPress={onRefreshPress}
                  className="p-2 mb-0.5 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 items-center justify-center active:opacity-70"
               >
                  <RefreshCw size={18} color={isDark ? '#f8fafc' : '#0f172a'} />
               </Pressable>
            ) : isCoolingDown && timeLabel !== '' ? (
               <View
                  className={`px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded mb-0.5 ${!isCoolingDown && refreshCostNote ? 'mt-auto' : ''}`}
               >
                  <Text
                     className="text-[11px] font-bold text-slate-500 dark:text-slate-400"
                     style={{ fontVariant: ['tabular-nums'] }}
                  >
                     {timeLabel}
                  </Text>
               </View>
            ) : null}
         </View>
      </View>
   );
}

// --- CRISIS ---
export function AiInsightCrisisBanner({
   safety,
   isDark,
}: {
   safety?: InsightSafety | null;
   isDark: boolean;
}) {
   if (!safety?.isCrisis) return null;

   return (
      <View className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-100 dark:border-red-800">
         <View className="flex-row items-center gap-2 mb-1">
            <TriangleAlert size={16} color={isDark ? '#fecaca' : '#991b1b'} />
            <Text className="text-sm font-bold text-red-800 dark:text-red-200">
               You deserve support
            </Text>
         </View>
         <Text className="text-sm leading-6 text-red-700 dark:text-red-300">
            {safety.crisisMessage}
         </Text>
      </View>
   );
}

// --- EMOTIONAL VALIDATION ---
export function AiInsightEmotionalValidation({
   emotionalLogic,
   animationTimeline,
}: {
   emotionalLogic?: string | null;
   animationTimeline: AnimationTimeline;
}) {
   // Replaced entering prop with custom hook
   const animStyle = useDelayedAppearance(animationTimeline.emotionAppear);

   if (!emotionalLogic) return null;

   return (
      <Animated.View style={animStyle}>
         <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            Your reaction makes sense
         </Text>
         <Text className="text-sm leading-6 text-slate-700 dark:text-slate-300">
            {emotionalLogic}
         </Text>
      </Animated.View>
   );
}

// --- THINKING PATTERNS ---
export type AiInsightThinkingPatternsProps = {
   dims?: InsightDimensions | null;
   showDefinitions: boolean;
   toggleHelp: () => void;
   animationTimeline: AnimationTimeline;
   isFreshAnalysis: boolean;
   isDark: boolean;
};

export function AiInsightThinkingPatterns({
   dims,
   showDefinitions,
   toggleHelp,
   animationTimeline,
   isFreshAnalysis,
   isDark,
}: AiInsightThinkingPatternsProps) {
   // Replaced entering prop
   const headerStyle = useDelayedAppearance(animationTimeline.headerAppear);

   if (!dims) return null;

   return (
      <View>
         <Animated.View style={headerStyle}>
            <View className="flex-row items-center justify-between mb-4">
               <View className="flex-row items-center gap-2">
                  <Layers size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                     Thinking Patterns
                  </Text>
               </View>

               <Pressable onPress={toggleHelp}>
                  <View
                     className={`flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${
                        showDefinitions
                           ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                           : 'border-transparent'
                     }`}
                  >
                     <BookOpen
                        size={12}
                        color={isDark ? '#94a3b8' : '#64748b'}
                     />
                     <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Guide
                     </Text>
                     {showDefinitions ? (
                        <ChevronUp
                           size={12}
                           color={isDark ? '#94a3b8' : '#64748b'}
                        />
                     ) : (
                        <ChevronDown
                           size={12}
                           color={isDark ? '#94a3b8' : '#64748b'}
                        />
                     )}
                  </View>
               </Pressable>
            </View>
            {showDefinitions && (
               <View className="mb-4">
                  <PInsightCard context="entry" />
               </View>
            )}
         </Animated.View>

         <View className="gap-6">
            <AnimatedSpectrumRow
               label="Time"
               subLabel="(Permanence)"
               leftText="Temporary"
               rightText="Permanent"
               score={dims.permanence.score}
               insight={dims.permanence.insight}
               detectedPhrase={dims.permanence.detectedPhrase}
               startDelay={animationTimeline.timeStart}
               skipAnimation={!isFreshAnalysis}
            />
            <AnimatedSpectrumRow
               label="Scope"
               subLabel="(Pervasiveness)"
               leftText="Specific"
               rightText="Pervasive"
               score={dims.pervasiveness.score}
               insight={dims.pervasiveness.insight}
               detectedPhrase={dims.pervasiveness.detectedPhrase}
               startDelay={animationTimeline.scopeStart}
               skipAnimation={!isFreshAnalysis}
            />
            <AnimatedSpectrumRow
               label="Blame"
               subLabel="(Personalization)"
               leftText="External"
               rightText="Internal"
               score={dims.personalization.score}
               insight={dims.personalization.insight}
               detectedPhrase={dims.personalization.detectedPhrase}
               startDelay={animationTimeline.blameStart}
               skipAnimation={!isFreshAnalysis}
            />
         </View>
      </View>
   );
}

// --- SUGGESTION ---
export function AiInsightSuggestion({
   counterBelief,
   animationTimeline,
}: {
   counterBelief?: string | null;
   animationTimeline: AnimationTimeline;
   
}) {
   // Replaced entering prop
   const animStyle = useDelayedAppearance(animationTimeline.suggestionStart);


   if (!counterBelief) return null;

   return (
      <Animated.View
         style={animStyle}
         className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-4 border border-indigo-100 dark:border-indigo-800/50 mt-2"
      >
         <View className="flex-row items-center gap-2 mb-2">
            <Quote size={16} color="#4f46e5" />
            <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">
               Try this perspective
            </Text>
         </View>
         <Text className="text-[15px] font-medium leading-6 text-indigo-900 dark:text-indigo-100 italic">
            &quot;{counterBelief}&quot;
         </Text>
      </Animated.View>
   );
}

// --- DISCLAIMER ---
export type AiInsightDisclaimerProps = {
   allowMinimize: boolean;
   toggleMinimized: () => void;
   animationTimeline: AnimationTimeline;
   isDark: boolean;
   onAnimationComplete?: () => void;
};

export function AiInsightDisclaimer({
   allowMinimize,
   toggleMinimized,
   animationTimeline,
   isDark,
   onAnimationComplete,
}: AiInsightDisclaimerProps) {
   // Replaced entering prop
   const animStyle = useDelayedAppearance(animationTimeline.disclaimerStart, onAnimationComplete);

   return (
      <Animated.View
         style={animStyle}
         className="flex-row gap-2 mt-1 px-1 opacity-70"
      >
         <Info
            size={14}
            color={isDark ? '#94a3b8' : '#64748b'}
            style={{ marginTop: 2 }}
         />
         <Text className="flex-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
            This analysis is generated by AI and is for self-reflection purposes
            only. It is not a substitute for professional mental health advice.
         </Text>
         {allowMinimize && (
            <Pressable
               onPress={toggleMinimized}
               className="flex-row items-center gap-1"
            >
               <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Less
               </Text>
               <ChevronUp size={12} color={isDark ? '#94a3b8' : '#64748b'} />
            </Pressable>
         )}
      </Animated.View>
   );
}
