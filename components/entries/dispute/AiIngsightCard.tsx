import { getIosShadowStyle } from '@/lib/shadow';
import { LearnedGrowthResponse } from '@/models/aiService';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ThreeDotsLoader from '../../ThreeDotLoader';

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

// --- Main Component ---
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

   const iosShadowSm = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'sm' }),
      [isDark]
   );

   // --- COOLDOWN & NUDGE LOGIC ---
   const COOLDOWN_MINUTES = 2; // Your debug value

   // 1. Identify States
   // Cooldown at multiples of cycle (e.g., 4, 8, 12...)
   const isAtLimitStep = retryCount > 0 && retryCount % maxRetries === 0;
   const isNudgeStep =
      retryCount > 0 && retryCount % maxRetries === maxRetries - 1;

   // 2. Calculate time diff (Using your preferred logic)
   const lastUpdate = useMemo(
      () => (updatedAt ? new Date(updatedAt) : new Date()),
      [updatedAt]
   );
   const now = new Date();
   const minsSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 60000;

   // 3. Determine Lock State
   const isCoolingDown = isAtLimitStep && minsSinceUpdate < COOLDOWN_MINUTES;

   // --- TIMER EFFECT ---
   const [timeLabel, setTimeLabel] = useState('');

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

   // --- LOADING / ERROR STATES ---
   if (error) {
      return (
         <View className="p-4 rounded-2xl bg-belief-bg border border-belief-border gap-2">
            <Text className="text-lg font-bold text-belief-text">
               AI couldn’t respond
            </Text>
            <Text className="text-sm text-belief-text opacity-90">{error}</Text>
         </View>
      );
   }

   const MAX_VISIBLE_CHARS = 250;
   const renderStreamingText =
      streamingText && streamingText.length > MAX_VISIBLE_CHARS
         ? '…' + streamingText.slice(-MAX_VISIBLE_CHARS)
         : streamingText;

   if (!data) {
      return (
         <View className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 gap-4">
            <View className="items-center py-2">
               <ThreeDotsLoader />
            </View>
            <View className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm min-h-[100px]">
               <View className="flex-row items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <View className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     ANALYZING ENTRY...
                  </Text>
               </View>
               <Text className="text-[11px] text-slate-600 dark:text-slate-400 leading-4 font-mono">
                  {renderStreamingText || 'Connecting...'}
               </Text>
            </View>
         </View>
      );
   }

   const { safety, analysis, suggestions, isStale } = data;
   const { dimensions: dims, emotionalLogic } = analysis;

   return (
      <View className="gap-4 pb-4">
         {isStale && (
            <View
               className={`flex-row items-center justify-between p-3 rounded-lg border mb-2 ${
                  isCoolingDown
                     ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' // GREY (Locked)
                     : isNudgeStep
                       ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' // AMBER (Nudge)
                       : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' // BLUE (Standard)
               }`}
            >
               <View className="flex-1 gap-1 mr-2">
                  <View className="flex-row items-center gap-2">
                     <Ionicons
                        name={
                           isCoolingDown ? 'hourglass-outline' : 'time-outline'
                        }
                        size={16}
                        color={isDark ? '#94a3b8' : '#64748b'}
                     />
                     <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        {isCoolingDown
                           ? 'Analysis Paused'
                           : 'Previous Analysis'}
                     </Text>
                  </View>

                  <Text className="text-[11px] text-slate-600 dark:text-slate-400 leading-4">
                     {isCoolingDown
                        ? 'Updates paused to encourage you to continue to the next step.'
                        : isNudgeStep
                          ? "You've refined this quite a bit. Ready to move to the next step?" 
                          : 'Entry has changed. Update analysis?'}
                  </Text>
               </View>

               {/* BUTTON: Show if NOT cooling down */}
               {onRefresh && !isCoolingDown && (
                  <Pressable
                     onPress={onRefresh}
                     hitSlop={12}
                     className="p-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 items-center justify-center active:opacity-70 shadow-xs"
                  >
                     <Ionicons
                        name="refresh"
                        size={18}
                        color={isDark ? '#f8fafc' : '#0f172a'}
                     />
                  </Pressable>
               )}

               {/* LOCKED BADGE: Show if cooling down */}
               {isCoolingDown && timeLabel !== '' && (
                  <View className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">
                     {/* Use tabular-nums so the width doesn't jitter as numbers change */}
                     <Text
                        className="text-[11px] font-bold text-slate-500 dark:text-slate-400"
                        style={{ fontVariant: ['tabular-nums'] }}
                     >
                        {timeLabel}
                     </Text>
                  </View>
               )}
            </View>
         )}

         {/* Crisis Banner */}
         {safety.isCrisis && (
            <View className="rounded-xl p-4 bg-belief-bg border border-belief-border shadow-sm">
               <Text className="text-base font-bold text-belief-text mb-1">
                  You deserve support
               </Text>
               <Text className="text-[13px] leading-5 text-belief-text">
                  {safety.crisisMessage}
               </Text>
            </View>
         )}

         {/* Emotional Validation */}
         <View className="py-2 px-1">
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
               Your reaction makes sense
            </Text>
            {!!emotionalLogic && (
               <Text className="text-[15px] leading-6 text-slate-700 dark:text-slate-300">
                  {emotionalLogic}
               </Text>
            )}
         </View>

         {/* 3 Ps (Dimensions) */}
         <View className="gap-3">
            <Text className="text-[15px] font-bold text-slate-900 dark:text-slate-100 ml-1">
               How your mind is seeing this
            </Text>
            <DimensionCard
               label="Permanence (Time)"
               score={dims.permanence.score}
               insight={dims.permanence.insight ?? undefined}
               detectedPhrase={dims.permanence.detectedPhrase ?? undefined}
               baseColor="#ef4444"
            />
            <DimensionCard
               label="Pervasiveness (Scope)"
               score={dims.pervasiveness.score}
               insight={dims.pervasiveness.insight ?? undefined}
               detectedPhrase={dims.pervasiveness.detectedPhrase ?? undefined}
               baseColor="#3b82f6"
            />
            <DimensionCard
               label="Personalization (Blame)"
               score={dims.personalization.score}
               insight={dims.personalization.insight ?? undefined}
               detectedPhrase={dims.personalization.detectedPhrase ?? undefined}
               baseColor="#8b5cf6"
            />
         </View>

         {/* Suggestion */}
         {suggestions.counterBelief && (
            <View className="mt-2">
               <Text className="text-[15px] font-bold text-slate-900 dark:text-slate-100 ml-1 mb-2">
                  Another way to see it
               </Text>

               <View
                  className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
                  style={iosShadowSm}
               >
                  <Text className="text-[15px] leading-6 font-medium text-slate-800 dark:text-slate-200 italic">
                     &quot;{suggestions.counterBelief}&quot;
                  </Text>
               </View>
            </View>
         )}
      </View>
   );
}

// ... DimensionCard ...
type Score = 'optimistic' | 'mixed' | 'pessimistic' | null | undefined | string;

function DimensionCard({
   label,
   score,
   insight,
   detectedPhrase,
   baseColor,
}: {
   label: string;
   score: Score;
   insight?: string;
   detectedPhrase?: string;
   baseColor: string;
}) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const iosShadowSm = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'sm' }),
      [isDark]
   );

   const chipStyle = useMemo(() => {
      const baseContainer =
         'px-2 py-0.5 rounded-full border items-center flex-row gap-1.5 self-start';
      const baseText = 'text-[11px] font-semibold';

      switch (score) {
         case 'optimistic':
            return {
               label: 'Optimistic',
               container: `${baseContainer} bg-dispute-bg border-dispute-cta`,
               text: `${baseText} text-dispute-text`,
            };
         case 'pessimistic':
            return {
               label: 'Pessimistic',
               container: `${baseContainer} bg-belief-bg border-belief-border`,
               text: `${baseText} text-belief-text`,
            };
         case 'mixed':
            return {
               label: 'Mixed',
               container: `${baseContainer} bg-zinc-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600`,
               text: `${baseText} text-slate-900 dark:text-slate-100`,
            };
         default:
            return {
               label: 'Neutral',
               container: `${baseContainer} bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700`,
               text: `${baseText} text-slate-600 dark:text-slate-300`,
            };
      }
   }, [score]);

   return (
      <View
         className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm gap-2"
         style={iosShadowSm}
      >
         <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
               {label}
            </Text>
            <View className={chipStyle.container}>
               <Text className={chipStyle.text}>{chipStyle.label}</Text>
            </View>
         </View>

         {detectedPhrase && (
            <View
               className="self-start px-2 py-1.5 rounded-lg mb-0.5"
               style={{
                  backgroundColor: baseColor + (isDark ? '33' : '4D'),
               }}
            >
               <Text className="text-xs font-medium text-slate-900 dark:text-slate-100 italic">
                  &quot;{detectedPhrase}&quot;
               </Text>
            </View>
         )}

         <Text className="text-[13px] leading-5 text-slate-700 dark:text-slate-300">
            {insight || 'No clear pattern detected here.'}
         </Text>
      </View>
   );
}
