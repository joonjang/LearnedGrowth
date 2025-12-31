import {
   AI_ANALYSIS_CREDIT_COST,
   FREE_MONTHLY_CREDITS,
} from '@/components/constants';
import CreditShop from '@/components/CreditShop';
import { LearnedGrowthResponse } from '@/models/aiService';
import { useAuth } from '@/providers/AuthProvider';
import { PInsightCard } from '@/components/appInfo/PDefinitions';
import * as Haptics from 'expo-haptics';
import {
   Clock3,
   HelpCircle,
   Hourglass,
   Info,
   Layers,
   Leaf,
   RefreshCw,
   Sparkles,
   X,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import {
   ActivityIndicator,
   LayoutAnimation,
   Pressable,
   Text,
   View,
} from 'react-native';
import Animated, {
   Easing,
   FadeInDown,
   interpolateColor,
   useAnimatedStyle,
   useSharedValue,
   withDelay,
   withSequence,
   withSpring,
   withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

type Props = {
   data?: LearnedGrowthResponse | null;
   streamingText?: string;
   loading?: boolean;
   error?: string | null;
   onRefresh?: () => void;
   retryCount?: number;
   maxRetries?: number;
   updatedAt?: string;
};

export function AiInsightCard({
   data,
   streamingText,
   error,
   onRefresh,
   retryCount = 0,
   maxRetries = 3,
   updatedAt,
}: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { profile, status, refreshProfile, refreshProfileIfStale } = useAuth();
   const isFreePlan = profile?.plan === 'free';

   const availableCredits = useMemo(() => {
      if (!profile) return null;
      return (
         Math.max(FREE_MONTHLY_CREDITS - (profile.aiCallsUsed ?? 0), 0) +
         (profile.extraAiCredits ?? 0)
      );
   }, [profile]);

   const refreshCostNote = useMemo(() => {
      if (!isFreePlan) return null;
      const costSuffix = AI_ANALYSIS_CREDIT_COST === 1 ? '' : 's';
      if (availableCredits === null) {
         return `Costs ${AI_ANALYSIS_CREDIT_COST} credit${costSuffix}.`;
      }
      const remainingSuffix = availableCredits === 1 ? '' : 's';
      return `Costs ${AI_ANALYSIS_CREDIT_COST} credit${costSuffix} • ${availableCredits} credit${remainingSuffix} left`;
   }, [availableCredits, isFreePlan]);

   const [showDefinitions, setShowDefinitions] = useState(false);
   const [showShop, setShowShop] = useState(false);

   const toggleHelp = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowDefinitions(!showDefinitions);
   };

   // --- COOLDOWN LOGIC ---
   const COOLDOWN_MINUTES = 2;
   const isAtLimitStep = retryCount > 0 && retryCount % maxRetries === 0;
   const isNudgeStep =
      retryCount > 0 && retryCount % maxRetries === maxRetries - 1;

   const lastUpdate = useMemo(
      () => (updatedAt ? new Date(updatedAt) : new Date()),
      [updatedAt]
   );
   const now = new Date();
   const minsSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 60000;
   const isCoolingDown = isAtLimitStep && minsSinceUpdate < COOLDOWN_MINUTES;

   const [timeLabel, setTimeLabel] = useState('');

   useEffect(() => {
      if (status !== 'signedIn') return;
      refreshProfileIfStale();
   }, [refreshProfileIfStale, status]);

   useEffect(() => {
      if (!isCoolingDown) return;
      const unlockTime = lastUpdate.getTime() + COOLDOWN_MINUTES * 60000;
      const updateTimer = () => {
         const currentNow = new Date().getTime();
         const diff = unlockTime - currentNow;
         if (diff <= 0) {
            setTimeLabel('');
         } else {
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLabel(
               `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            );
         }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
   }, [isCoolingDown, lastUpdate]);

   // --- FRESHNESS LOGIC ---
   // We only show the full scanner animation if the data is "fresh" (generated < 20 seconds ago).
   // Otherwise, we show a quick fade-in.
   const isFreshAnalysis = useMemo(() => {
      if (!data?.createdAt) return false;
      const diffMs = new Date().getTime() - new Date(data.createdAt).getTime();
      return diffMs < 20000; // 20 seconds threshold
   }, [data?.createdAt]);

   // --- ERROR STATE ---
   if (error) {
      return (
         <View className="py-2">
            <Text className="text-sm font-medium text-red-600 dark:text-red-400">
               Unable to load analysis. {error}
            </Text>
         </View>
      );
   }

   // --- LOADING STATE ---
   const MAX_VISIBLE_CHARS = 120;
   const renderStreamingText =
      streamingText && streamingText.length > MAX_VISIBLE_CHARS
         ? '…' + streamingText.slice(-MAX_VISIBLE_CHARS)
         : streamingText;

   if (!data) {
      return (
         <View className="my-1 rounded-2xl border border-indigo-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <View className="mb-4 flex-row items-center gap-3">
               <View className="flex items-center justify-center rounded-full bg-indigo-50 p-2 dark:bg-indigo-500/20">
                  <Sparkles size={18} color={isDark ? '#818cf8' : '#4f46e5'} />
               </View>
               <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
                     Analyzing your story...
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                     Looking for patterns in the 3 P&apos;s
                  </Text>
               </View>
            </View>

            <View className="min-h-[80px] rounded-xl bg-slate-50 px-4 py-3 dark:bg-black/20">
               <View className="mb-2 flex-row opacity-60">
                  <ActivityIndicator size="small" color="#6366f1" />
               </View>
               <Text className="font-mono text-xs leading-5 text-indigo-900/70 dark:text-indigo-200/70">
                  {renderStreamingText || 'Connecting to insight engine...'}
               </Text>
            </View>
         </View>
      );
   }

   const { safety, analysis, suggestions, isStale } = data;
   const { dimensions: dims, emotionalLogic } = analysis;

   const handleRefreshPress = async () => {
      const noCredits = availableCredits !== null && availableCredits <= 0;
      if (noCredits) {
         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
         setShowShop(true);
         return;
      }
      try {
         await onRefresh?.();
      } finally {
         if (status === 'signedIn') {
            refreshProfile();
         }
      }
   };

   // --- ANIMATION TIMINGS ---
   // If fresh: Use long cinematic delays.
   // If old: Use short staggering delays (just to look nice).
   const BASE_STAGGER = 75; // Speed of stagger for old data

   const EMOTION_APPEAR = isFreshAnalysis ? 500 : 0;
   const HEADER_APPEAR = isFreshAnalysis ? 800 : BASE_STAGGER;

   // Row 1: Time
   const TIME_START = isFreshAnalysis ? 1000 : BASE_STAGGER * 2;
   const ROW_DURATION = isFreshAnalysis ? 3500 : 0; // If old, duration is effectively instant

   // Row 2: Scope
   const SCOPE_START =
      TIME_START + ROW_DURATION + (isFreshAnalysis ? 0 : BASE_STAGGER);

   // Row 3: Blame
   const BLAME_START =
      SCOPE_START + ROW_DURATION + (isFreshAnalysis ? 0 : BASE_STAGGER);

   // Suggestion
   const SUGGESTION_START =
      BLAME_START + ROW_DURATION + (isFreshAnalysis ? 0 : BASE_STAGGER);

   return (
      <View className="gap-6 pt-1">
         {/* 0. Credit Shop */}
         {showShop && (
            <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 gap-3">
               <View className="flex-row justify-between items-center">
                  <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
                     Refill AI credits
                  </Text>
                  <Pressable
                     onPress={() => {
                        LayoutAnimation.configureNext(
                           LayoutAnimation.Presets.easeInEaseOut
                        );
                        setShowShop(false);
                     }}
                     hitSlop={10}
                  >
                     <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Close
                     </Text>
                  </Pressable>
               </View>

               <CreditShop
                  onSuccess={async () => {
                     LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut
                     );
                     setShowShop(false);
                     if (status === 'signedIn') {
                        try {
                           await refreshProfile();
                        } catch (err) {
                           console.warn(
                              'Failed to refresh credits after purchase',
                              err
                           );
                        }
                     }
                  }}
               />
            </View>
         )}

         {/* 1. Stale / Refresh Banner */}
         {isStale && (
            <View
               className={`flex-row items-center justify-between p-3 rounded-lg border mb-2 ${
                  isCoolingDown
                     ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                     : isNudgeStep
                       ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                       : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
               }`}
            >
               <View className="flex-1 gap-1 mr-2">
                  <View className="flex-row items-center flex-wrap gap-x-3">
                     <View className="flex-row items-center gap-2">
                        {isCoolingDown ? (
                           <Hourglass
                              size={16}
                              color={isDark ? '#94a3b8' : '#64748b'}
                           />
                        ) : (
                           <Clock3
                              size={16}
                              color={isDark ? '#94a3b8' : '#64748b'}
                           />
                        )}
                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                           {isCoolingDown
                              ? 'Analysis Paused'
                              : 'Previous Analysis'}
                        </Text>
                     </View>

                     {!isCoolingDown && refreshCostNote && (
                        <View className="flex-row items-center opacity-90">
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
                          ? 'Updates paused to encourage you to continue to the next step.'
                          : isNudgeStep
                            ? "You've refined this quite a bit. Ready to move to the next step?"
                            : 'Entry has changed. Update analysis?'}
                  </Text>
               </View>

               {onRefresh && !isCoolingDown ? (
                  <Pressable
                     onPress={handleRefreshPress}
                     className="p-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 items-center justify-center active:opacity-70"
                  >
                     <RefreshCw
                        size={18}
                        color={isDark ? '#f8fafc' : '#0f172a'}
                     />
                  </Pressable>
               ) : isCoolingDown && timeLabel !== '' ? (
                  <View className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">
                     <Text
                        className="text-[11px] font-bold text-slate-500 dark:text-slate-400"
                        style={{ fontVariant: ['tabular-nums'] }}
                     >
                        {timeLabel}
                     </Text>
                  </View>
               ) : null}
            </View>
         )}

         {/* 2. Crisis Banner */}
         {safety.isCrisis && (
            <View className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-100 dark:border-red-800">
               <Text className="text-sm font-bold text-red-800 dark:text-red-200 mb-1">
                  You deserve support
               </Text>
               <Text className="text-sm leading-6 text-red-700 dark:text-red-300">
                  {safety.crisisMessage}
               </Text>
            </View>
         )}

         {/* 3. Emotional Validation */}
         <Animated.View entering={FadeInDown.delay(EMOTION_APPEAR)}>
            <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
               Your reaction makes sense
            </Text>
            <Text className="text-sm leading-6 text-slate-700 dark:text-slate-300">
               {emotionalLogic}
            </Text>
         </Animated.View>

         {/* 4. The 3 Ps */}
         <View>
            <Animated.View entering={FadeInDown.delay(HEADER_APPEAR)}>
               <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                     <Layers size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                     <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Thinking Patterns (The 3 P&apos;s)
                     </Text>
                  </View>
                  <Pressable
                     onPress={toggleHelp}
                     hitSlop={10}
                     className="opacity-60 active:opacity-100"
                  >
                     {showDefinitions ? (
                        <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                     ) : (
                        <HelpCircle
                           size={16}
                           color={isDark ? '#94a3b8' : '#64748b'}
                        />
                     )}
                  </Pressable>
               </View>

               {showDefinitions && <PInsightCard />}
            </Animated.View>

            {/* ANIMATED ROWS */}
            <View className="gap-6">
               <Animated.View entering={FadeInDown.delay(TIME_START)}>
                  <AnimatedSpectrumRow
                     label="Time"
                     subLabel="(Permanence)"
                     leftText="Temporary"
                     rightText="Permanent"
                     score={dims.permanence.score}
                     insight={dims.permanence.insight}
                     detectedPhrase={dims.permanence.detectedPhrase}
                     startDelay={TIME_START}
                     skipAnimation={!isFreshAnalysis}
                  />
               </Animated.View>

               <Animated.View entering={FadeInDown.delay(SCOPE_START)}>
                  <AnimatedSpectrumRow
                     label="Scope"
                     subLabel="(Pervasiveness)"
                     leftText="Specific"
                     rightText="Pervasive"
                     score={dims.pervasiveness.score}
                     insight={dims.pervasiveness.insight}
                     detectedPhrase={dims.pervasiveness.detectedPhrase}
                     startDelay={SCOPE_START}
                     skipAnimation={!isFreshAnalysis}
                  />
               </Animated.View>

               <Animated.View entering={FadeInDown.delay(BLAME_START)}>
                  <AnimatedSpectrumRow
                     label="Blame"
                     subLabel="(Personalization)"
                     leftText="External"
                     rightText="Internal"
                     score={dims.personalization.score}
                     insight={dims.personalization.insight}
                     detectedPhrase={dims.personalization.detectedPhrase}
                     startDelay={BLAME_START}
                     skipAnimation={!isFreshAnalysis}
                  />
               </Animated.View>
            </View>
         </View>

         {/* 5. Suggestion / Reframe */}
         {suggestions.counterBelief && (
            <Animated.View
               entering={FadeInDown.delay(SUGGESTION_START).springify()}
               className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-4 border border-indigo-100 dark:border-indigo-800/50 mt-2"
            >
               <View className="flex-row items-center gap-2 mb-2">
                  <Sparkles size={16} color="#4f46e5" />
                  <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                     Try this perspective
                  </Text>
               </View>
               <Text className="text-[15px] font-medium leading-6 text-indigo-900 dark:text-indigo-100 italic">
                  &quot;{suggestions.counterBelief}&quot;
               </Text>
            </Animated.View>
         )}

         {/* 6. Disclaimer */}
         <Animated.View
            entering={FadeInDown.delay(SUGGESTION_START + 200)}
            className="flex-row gap-2 mt-1 px-1 opacity-70"
         >
            <Info
               size={14}
               color={isDark ? '#94a3b8' : '#64748b'}
               style={{ marginTop: 2 }}
            />
            <Text className="flex-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
               This analysis is generated by AI and is for self-reflection
               purposes only. It is not a substitute for professional mental
               health advice, diagnosis, or treatment.
            </Text>
         </Animated.View>
      </View>
   );
}

// --- SUB-COMPONENT: ANIMATED ROW (FINAL VERSION) ---
function AnimatedSpectrumRow({
   label,
   subLabel,
   leftText,
   rightText,
   score,
   insight,
   detectedPhrase,
   startDelay,
   skipAnimation,
}: {
   label: string;
   subLabel: string;
   leftText: string;
   rightText: string;
   score: string | null | undefined;
   insight?: string | null;
   detectedPhrase?: string | null;
   startDelay: number;
   skipAnimation: boolean;
}) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const lowerScore = score?.toLowerCase() || '';
   const isOptimistic = lowerScore === 'optimistic';
   const isPessimistic = lowerScore === 'pessimistic';
   const isMixed = lowerScore === 'mixed';

   // Target: 0 (Left), 0.5 (Mid), 1 (Right)
   const targetPosition = isOptimistic ? 0 : isPessimistic ? 1 : 0.5;

   // Memoize theme to prevent re-renders
   const theme = useMemo(
      () => ({
         inactiveBg: isDark ? '#0f172a' : '#f8fafc',
         inactiveBorder: isDark ? '#1e293b' : '#f1f5f9',
         inactiveText: isDark ? '#475569' : '#94a3b8',

         // Gaussian Buffer Colors
         bufferBgLow: isDark ? '#0f172a' : '#f8fafc',
         bufferBgHigh: isDark ? 'rgba(99, 102, 241, 0.25)' : '#e0e7ff',
         bufferBorderLow: isDark ? '#1e293b' : '#f1f5f9',
         bufferBorderHigh: isDark ? 'rgba(99, 102, 241, 0.6)' : '#c7d2fe',
         bufferTextLow: isDark ? '#475569' : '#94a3b8',
         bufferTextHigh: isDark ? '#a5b4fc' : '#6366f1',

         // Final Colors
         greenBg: isDark ? 'rgba(6, 95, 70, 0.5)' : '#d1fae5',
         greenBorder: isDark ? '#065f46' : '#a7f3d0',
         greenText: isDark ? '#a7f3d0' : '#065f46',

         redBg: isDark ? 'rgba(136, 19, 55, 0.5)' : '#ffe4e6',
         redBorder: isDark ? '#881337' : '#fecdd3',
         redText: isDark ? '#fecdd3' : '#9f1239',

         mixedBg: isDark ? '#334155' : '#e2e8f0',
         mixedBorder: isDark ? '#475569' : '#cbd5e1',
         mixedText: isDark ? '#f1f5f9' : '#1e293b',
      }),
      [isDark]
   );

   // Shared Values
   // If skipping, start at 1 (Fully revealed). If animating, start at 0.
   const revealState = useSharedValue(0);
   // If skipping, scanner lights up target immediately.
   const scannerProgress = useSharedValue(skipAnimation ? targetPosition : 0);
   const impactScale = useSharedValue(1);

   const triggerHaptic = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
   };

   useEffect(() => {
      // FAST TRACK: If not fresh analysis, skip logic
      if (skipAnimation) {
         // Force final state immediately (with soft transition)
         scannerProgress.value = targetPosition;
         revealState.value = withTiming(1, { duration: 600 });
         return;
      }

      // COMPLEX TRACK: Run the scanner
      const timer = setTimeout(() => {
         const SWIPE_SPEED = 800;
         const SWIPE_EASING = Easing.inOut(Easing.sin);

         scannerProgress.value = 0;

         const sequence: any[] = [
            withTiming(1, { duration: SWIPE_SPEED, easing: SWIPE_EASING }),
            withTiming(0, { duration: SWIPE_SPEED, easing: SWIPE_EASING }),
            withTiming(1, { duration: SWIPE_SPEED, easing: SWIPE_EASING }),
         ];

         const dist = Math.abs(1 - targetPosition);
         const finalDuration = dist === 0 ? 0 : SWIPE_SPEED * dist;

         const onFinish = (finished: boolean | undefined) => {
            if (finished) {
               scheduleOnRN(triggerHaptic);
               revealState.value = withTiming(1, { duration: 600 });
               impactScale.value = withSequence(
                  withTiming(0.92, { duration: 150 }),
                  withSpring(1.0, { damping: 15, stiffness: 150 })
               );
            }
         };

         if (dist > 0) {
            sequence.push(
               withTiming(
                  targetPosition,
                  { duration: finalDuration, easing: Easing.out(Easing.sin) },
                  onFinish
               )
            );
         } else {
            sequence.push(
               withDelay(50, withTiming(1, { duration: 0 }, onFinish))
            );
         }

         scannerProgress.value = withSequence(...sequence);
      }, startDelay);

      return () => clearTimeout(timer);
   }, [
      targetPosition,
      startDelay,
      skipAnimation,
      scannerProgress,
      revealState,
      impactScale,
   ]);

   const makeAnimatedStyles = (
      pillPosition: number,
      isWinner: boolean,
      activeType: 'green' | 'red' | 'mixed'
   ) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const containerStyle = useAnimatedStyle(() => {
         const positionDelta = scannerProgress.value - pillPosition;
         const intensity = Math.exp(-Math.pow(positionDelta, 2) / 0.1);

         const currentBufferBg = interpolateColor(
            intensity,
            [0, 1],
            [theme.bufferBgLow, theme.bufferBgHigh]
         );
         const currentBufferBorder = interpolateColor(
            intensity,
            [0, 1],
            [theme.bufferBorderLow, theme.bufferBorderHigh]
         );

         const finalBg = isWinner ? theme[`${activeType}Bg`] : theme.inactiveBg;
         const finalBorder = isWinner
            ? theme[`${activeType}Border`]
            : theme.inactiveBorder;

         return {
            backgroundColor: interpolateColor(
               revealState.value,
               [0, 1],
               [currentBufferBg, finalBg]
            ),
            borderColor: interpolateColor(
               revealState.value,
               [0, 1],
               [currentBufferBorder, finalBorder]
            ),
            transform: [
               {
                  scale: isWinner ? impactScale.value : 1,
               },
            ],
         };
      });

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const textStyle = useAnimatedStyle(() => {
         const positionDelta = scannerProgress.value - pillPosition;
         const intensity = Math.exp(-Math.pow(positionDelta, 2) / 0.15);

         const currentBufferText = interpolateColor(
            intensity,
            [0, 1],
            [theme.bufferTextLow, theme.bufferTextHigh]
         );
         const finalText = isWinner
            ? theme[`${activeType}Text`]
            : theme.inactiveText;

         return {
            color: interpolateColor(
               revealState.value,
               [0, 1],
               [currentBufferText, finalText]
            ),
         };
      });

      return { containerStyle, textStyle };
   };

   const leftStyles = makeAnimatedStyles(0.0, isOptimistic, 'green');
   const mixedStyles = makeAnimatedStyles(0.5, isMixed, 'mixed');
   const rightStyles = makeAnimatedStyles(1.0, isPessimistic, 'red');

   const basePill = 'flex-1 py-2 rounded-lg items-center justify-center border';
   const baseText = 'font-medium text-xs';

   return (
      <View className="gap-3">
         <View className="flex-row items-baseline gap-2">
            <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
               {label}
            </Text>
            <Text className="text-xs text-slate-400 dark:text-slate-500">
               {subLabel}
            </Text>
         </View>

         {detectedPhrase && (
            <Text className="text-sm italic text-slate-500 dark:text-slate-400">
               &quot;{detectedPhrase}&quot;
            </Text>
         )}

         <View className="flex-row items-center gap-1.5">
            <Animated.View
               className={basePill}
               style={leftStyles.containerStyle}
            >
               <Animated.Text className={baseText} style={leftStyles.textStyle}>
                  {leftText}
               </Animated.Text>
            </Animated.View>

            <Animated.View
               className={`${basePill} max-w-[20%]`}
               style={mixedStyles.containerStyle}
            >
               <Animated.Text
                  className={baseText}
                  style={mixedStyles.textStyle}
               >
                  Mixed
               </Animated.Text>
            </Animated.View>

            <Animated.View
               className={basePill}
               style={rightStyles.containerStyle}
            >
               <Animated.Text
                  className={baseText}
                  style={rightStyles.textStyle}
               >
                  {rightText}
               </Animated.Text>
            </Animated.View>
         </View>

         <View className="pl-1 gap-1">
            <Text className="text-sm leading-6 text-slate-700 dark:text-slate-300">
               {insight || 'No clear pattern detected.'}
            </Text>
         </View>
      </View>
   );
}
