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
   Sparkles,
   TriangleAlert
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
   Pressable,
   Text,
   View,
   type DimensionValue,
   type StyleProp,
   type ViewStyle,
} from 'react-native';
import Animated, {
   Easing,
   FadeIn,
   FadeOut,
   useAnimatedStyle,
   useSharedValue,
   withDelay,
   withRepeat,
   withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AnimatedSpectrumRow } from './AnimatedSpectrumRow';
import type { AnimationTimeline } from './animation';
import { InsightDimensions, InsightSafety } from './types';

// --- HELPER HOOK ---
function useDelayedAppearance(delay: number, onComplete?: () => void) {
   const opacity = useSharedValue(0);
   const translateY = useSharedValue(10); 

   useEffect(() => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }, 
         (finished) => {
            if (finished && onComplete) {
               scheduleOnRN(onComplete);
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

// --- MINIMIZED STATE (The Replacement) ---
export function AiInsightMinimizedState({
   previewText,
   isDark,
}: {
   previewText?: string | null;
   isDark: boolean;
}) {
   const chevronColor = isDark ? '#94a3b8' : '#64748b'; // Slate 400/500
   const iconColor = isDark ? '#818cf8' : '#4f46e5'; // Indigo

   return (
      <View className="relative">
         {/* 1. Technical Header Row */}
         <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 flex-row items-center mr-3 overflow-hidden">
               
               {/* Label */}
               <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500">
                  AI Analysis
               </Text>

               {/* Divider */}
               <Text className="text-[10px] text-slate-300 dark:text-slate-600 mx-2">
                  |
               </Text>

               {/* Description */}
               <Text 
                  className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex-1"
                  numberOfLines={1}
                  ellipsizeMode="tail"
               >
                  Alternative perspective
               </Text>
            </View>

            {/* Icon */}
            <View className="rounded-full pl-2">
               <Quote size={16} color={iconColor} />
            </View>
         </View>

         {/* 2. Preview Text (The Quote) */}
         {previewText && (
            <Text 
               className="text-sm italic leading-6 text-slate-600 dark:text-slate-400 opacity-90 mb-1"
               numberOfLines={3}
               ellipsizeMode="tail"
            >
               &quot;{previewText}&quot;
            </Text>
         )}
         
         {/* 3. Chevron Down - Pinned to Bottom Edge */}
         <View className="items-center justify-center -mb-2 mt-1">
            <ChevronDown size={20} color={chevronColor} />
         </View>
      </View>
   );
}

// --- HEADER (Expanded Only) ---
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
   if (isMinimized) return null;

   return (
      <View className="flex-row items-center justify-between mb-1">
         <View className="flex-row items-center gap-2">
            <Text className={`text-base font-bold ${textColor}`}>
               AI Analysis
            </Text>
            {isStale && (
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

function SkeletonItem({
   className = '',
   style,
   height = 16,
   width = '100%',
   borderRadius = 4,
   delay = 0,
}: {
   className?: string;
   style?: StyleProp<ViewStyle>;
   height?: DimensionValue;
   width?: DimensionValue;
   borderRadius?: number;
   delay?: number;
}) {
   const pulse = useSharedValue(0);

   useEffect(() => {
      pulse.value = withDelay(
         delay,
         withRepeat(
            withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
         )
      );
   }, [delay, pulse]);

   const animatedStyle = useAnimatedStyle(() => ({
      opacity: 0.2 + pulse.value * 0.6,
      transform: [{ scale: 0.985 + pulse.value * 0.015 }],
   }));

   return (
      <Animated.View
         className={`bg-slate-200 dark:bg-slate-700 ${className}`}
         style={[{ height, width, borderRadius }, animatedStyle, style]}
      />
   );
}

const INSIGHT_STATUS_BASE = [
   'Reading your entry...',
   'Identifying patterns...',
   'Drafting insights...',
   'Refining tone...',
   'Finalizing response...',
];

const INSIGHT_STATUS_STREAMING = [
   'Receiving response...',
   'Interpreting signals...',
   'Mapping patterns...',
   'Drafting insights...',
   'Finalizing response...',
];

function AiInsightStatus({ hasStream }: { hasStream: boolean }) {
   const messages = useMemo(
      () => (hasStream ? INSIGHT_STATUS_STREAMING : INSIGHT_STATUS_BASE),
      [hasStream]
   );
   const [index, setIndex] = useState(0);

   useEffect(() => {
      setIndex(0);
   }, [hasStream]);

   useEffect(() => {
      const interval = setInterval(() => {
         setIndex((prev) => (prev + 1) % messages.length);
      }, 2400);
      return () => clearInterval(interval);
   }, [messages.length]);

   return (
      <View className="flex-row items-center gap-3">
         <AiInsightStatusPulse />
         <View className="h-5 justify-center">
            <Animated.Text
               key={`${hasStream ? 'stream' : 'base'}-${index}`}
               entering={FadeIn.duration(250)}
               exiting={FadeOut.duration(250)}
               className="text-xs font-semibold text-indigo-600 dark:text-indigo-300"
            >
               {messages[index]}
            </Animated.Text>
         </View>
      </View>
   );
}

function AiInsightStatusPulse() {
   const pulse = useSharedValue(0);

   useEffect(() => {
      pulse.value = withRepeat(
         withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
         -1,
         true
      );
   }, [pulse]);

   const iconStyle = useAnimatedStyle(() => ({
      opacity: 0.65 + pulse.value * 0.35,
      transform: [{ scale: 0.92 + pulse.value * 0.12 }],
   }));

   return (
      <Animated.View style={iconStyle}>
         <Sparkles size={18} color="#6366f1" />
      </Animated.View>
   );
}

export function AiInsightLoadingState({
   streamLength: _streamLength = 0,
}: {
   streamLength?: number;
}) {
   const hasStream = _streamLength > 0;
   const widths = useMemo(() => {
      const randomPercent = (min: number, max: number): `${number}%` =>
         `${Math.round(min + Math.random() * (max - min))}%` as `${number}%`;
      const randomPx = (min: number, max: number) =>
         Math.round(min + Math.random() * (max - min));

      return {
         paragraph: [
            randomPercent(90, 100),
            randomPercent(80, 95),
            randomPercent(86, 98),
         ],
         rows: Array.from({ length: 3 }, () => ({
            left: randomPx(54, 86),
            right: randomPx(24, 40),
            subtext: randomPercent(45, 70),
         })),
         suggestion: [randomPercent(78, 100), randomPercent(62, 88)],
      };
   }, []);

   return (
      <View className="py-3 gap-6">
         <AiInsightStatus hasStream={hasStream} />

         <View className="gap-2.5">
            <SkeletonItem width={widths.paragraph[0]} height={12} delay={150} />
            <SkeletonItem width={widths.paragraph[1]} height={12} delay={200} />
            <SkeletonItem width={widths.paragraph[2]} height={12} delay={250} />
         </View>

         <View className="gap-6">
            <View className="flex-row items-center gap-2 mb-[-8px]">
               <SkeletonItem width={14} height={14} delay={300} />
               <SkeletonItem width={110} height={10} delay={350} />
            </View>
            {[0, 1, 2].map((row, index) => {
               const baseDelay = 400 + index * 150;
               const rowWidths = widths.rows[index];
               return (
               <View key={row} className="gap-2">
                  <View className="flex-row items-center justify-between">
                     <SkeletonItem width={rowWidths.left} height={10} delay={baseDelay} />
                     <SkeletonItem width={rowWidths.right} height={10} delay={baseDelay + 50} />
                  </View>
                  <View className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                     <SkeletonItem
                        width="100%"
                        height="100%"
                        className="bg-slate-200 dark:bg-slate-700"
                        delay={baseDelay + 100}
                     />
                  </View>
                  <SkeletonItem width={rowWidths.subtext} height={9} delay={baseDelay + 150} />
               </View>
               );
            })}
         </View>

         <View className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 gap-3 mt-2">
            <View className="flex-row items-center gap-2">
               <SkeletonItem width={14} height={14} borderRadius={7} delay={900} />
               <SkeletonItem width={120} height={10} delay={950} />
            </View>
            <SkeletonItem width={widths.suggestion[0]} height={12} delay={1000} />
            <SkeletonItem width={widths.suggestion[1]} height={12} delay={1050} />
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
   const animStyle = useDelayedAppearance(animationTimeline.emotionAppear);

   if (!emotionalLogic) return null;

   return (
      <Animated.View style={animStyle}>
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