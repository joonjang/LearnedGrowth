import { LearnedGrowthResponse } from '@/models/aiService';
import {
   Clock3,
   HelpCircle,
   Hourglass,
   RefreshCw,
   Sparkles,
   X,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
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

   // Toggle for the "Helper" definitions
   const [showDefinitions, setShowDefinitions] = useState(false);

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

   const toggleHelp = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowDefinitions(!showDefinitions);
   };

   // --- LOADING / ERROR STATES ---
   if (error) {
      return (
         <View className="py-2">
            <Text className="text-sm font-medium text-red-600 dark:text-red-400">
               Unable to load analysis. {error}
            </Text>
         </View>
      );
   }

   const MAX_VISIBLE_CHARS = 120;
   const renderStreamingText =
      streamingText && streamingText.length > MAX_VISIBLE_CHARS
         ? '…' + streamingText.slice(-MAX_VISIBLE_CHARS)
         : streamingText;

   if (!data) {
      return (
         <View className="my-1 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {/* Header: Active Status */}
            <View className="mb-4 flex-row items-center gap-3">
               <View className="flex items-center justify-center rounded-full bg-indigo-50 p-2 dark:bg-indigo-500/20">
                  <Sparkles size={18} color={isDark ? '#818cf8' : '#4f46e5'} />
               </View>
               <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
                     Analyzing your story...
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                     Looking for patterns in the 3 Ps
                  </Text>
               </View>
            </View>

            {/* Content: Streaming Area */}
            <View className="min-h-[80px] rounded-xl bg-slate-50 px-4 py-3 dark:bg-black/20">
               {/* Loader creates a nice 'activity' rhythm above the text */}
               <View className="mb-2 flex-row opacity-60">
                  <ThreeDotsLoader />
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

   return (
      <View className="gap-6 pt-1">
         {/* 1. Stale / Refresh Banner */}
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

                  {/* RESTORED LOGIC HERE */}
                  <Text className="text-[11px] text-slate-600 dark:text-slate-400 leading-4">
                     {!onRefresh
                        ? 'This insight is based on an older version of your entry.'
                        : isCoolingDown
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
                     <RefreshCw
                        size={18}
                        color={isDark ? '#f8fafc' : '#0f172a'}
                     />
                  </Pressable>
               )}

               {/* LOCKED BADGE: Show if cooling down */}
               {isCoolingDown && timeLabel !== '' && (
                  <View className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">
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
         <View>
            <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
               Your reaction makes sense
            </Text>
            <Text className="text-sm leading-6 text-slate-700 dark:text-slate-300">
               {emotionalLogic}
            </Text>
         </View>

         {/* 4. The 3 Ps (Redesigned) */}
         <View>
            <View className="flex-row items-center justify-between mb-3">
               <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Thinking Patterns (The 3 P&apos;s)
               </Text>
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

            {/* EXPANDABLE HELPER SECTION */}
            {showDefinitions && (
               <View className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 gap-2">
                  <Text className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                     <Text className="font-bold text-slate-700 dark:text-slate-300">
                        Time (Permanence):{' '}
                     </Text>
                     Is this setback temporary, or will it last forever?
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                     <Text className="font-bold text-slate-700 dark:text-slate-300">
                        Scope (Pervasiveness):{' '}
                     </Text>
                     Is this just one specific problem, or does it ruin
                     everything?
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                     <Text className="font-bold text-slate-700 dark:text-slate-300">
                        Blame (Personalization):{' '}
                     </Text>
                     Was this entirely my fault, or did circumstances play a
                     role?
                  </Text>
               </View>
            )}

            <View className="gap-6">
               <SpectrumRow
                  label="Time"
                  subLabel="(Permanence)"
                  leftText="Temporary"
                  rightText="Permanent"
                  score={dims.permanence.score}
                  insight={dims.permanence.insight}
                  detectedPhrase={dims.permanence.detectedPhrase}
               />
               <SpectrumRow
                  label="Scope"
                  subLabel="(Pervasiveness)"
                  leftText="Specific"
                  rightText="Pervasive"
                  score={dims.pervasiveness.score}
                  insight={dims.pervasiveness.insight}
                  detectedPhrase={dims.pervasiveness.detectedPhrase}
               />
               <SpectrumRow
                  label="Blame"
                  subLabel="(Personalization)"
                  leftText="External"
                  rightText="Internal"
                  score={dims.personalization.score}
                  insight={dims.personalization.insight}
                  detectedPhrase={dims.personalization.detectedPhrase}
               />
            </View>
         </View>

         {/* 5. Suggestion / Reframe */}
         {suggestions.counterBelief && (
            <View className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-4 border border-indigo-100 dark:border-indigo-800/50 mt-2">
               <View className="flex-row items-center gap-2 mb-2">
                  <Sparkles size={16} color="#4f46e5" />
                  <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                     Try this perspective
                  </Text>
               </View>
               <Text className="text-[15px] font-medium leading-6 text-indigo-900 dark:text-indigo-100 italic">
                  &quot;{suggestions.counterBelief}&quot;
               </Text>
            </View>
         )}
      </View>
   );
}

// --- NEW HELPER COMPONENT: SpectrumRow ---
// Layout: [ Left Pill ] -- [ Mixed Pill ] -- [ Right Pill ]

function SpectrumRow({
   label,
   subLabel,
   leftText,
   rightText,
   score,
   insight,
   detectedPhrase,
}: {
   label: string;
   subLabel: string;
   leftText: string;
   rightText: string;
   score: string | null | undefined;
   insight?: string | null;
   detectedPhrase?: string | null;
}) {
   const lowerScore = score?.toLowerCase() || '';

   const isOptimistic = lowerScore === 'optimistic';
   const isPessimistic = lowerScore === 'pessimistic';
   const isMixed = lowerScore === 'mixed';

   // --- STYLES ---
   // Bigger base text for pills
   const basePill = 'flex-1 py-2 rounded-lg items-center justify-center border';

   // Inactive State
   const inactivePill =
      'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800';
   const inactiveText =
      'text-slate-400 dark:text-slate-600 font-medium text-xs'; // Bumped to 12px

   // Active States
   const activeLeft =
      'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800';
   const textLeftActive =
      'text-emerald-800 dark:text-emerald-200 font-bold text-xs';

   const activeRight =
      'bg-rose-100 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800';
   const textRightActive = 'text-rose-800 dark:text-rose-200 font-bold text-xs';

   const activeMixed =
      'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
   const textMixedActive =
      'text-slate-800 dark:text-slate-100 font-bold text-xs';

   return (
      <View className="gap-3">
         {/* Label Header */}
         <View className="flex-row items-baseline gap-2">
            <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
               {label}
            </Text>
            <Text className="text-xs text-slate-400 dark:text-slate-500">
               {subLabel}
            </Text>
         </View>

         {/* The Spectrum Visual (3-Pill Layout) */}
         <View className="flex-row items-center gap-1.5">
            {/* Left (Optimistic) */}
            <View
               className={`${basePill} ${isOptimistic ? activeLeft : inactivePill}`}
            >
               <Text className={isOptimistic ? textLeftActive : inactiveText}>
                  {leftText}
               </Text>
            </View>

            {/* Middle (Mixed) */}
            <View
               className={`${basePill} ${isMixed ? activeMixed : inactivePill} max-w-[20%]`}
            >
               <Text className={isMixed ? textMixedActive : inactiveText}>
                  Mixed
               </Text>
            </View>

            {/* Right (Pessimistic) */}
            <View
               className={`${basePill} ${isPessimistic ? activeRight : inactivePill}`}
            >
               <Text className={isPessimistic ? textRightActive : inactiveText}>
                  {rightText}
               </Text>
            </View>
         </View>

         {/* Insight & Quote */}
         <View className="pl-1 gap-1">
            {detectedPhrase && (
               <Text className="text-sm italic text-slate-500 dark:text-slate-400">
                  &quot;{detectedPhrase}&quot;
               </Text>
            )}
            <Text className="text-sm leading-6 text-slate-700 dark:text-slate-300">
               {insight || 'No clear pattern detected.'}
            </Text>
         </View>
      </View>
   );
}
