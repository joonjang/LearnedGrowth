import { getIosShadowStyle } from '@/lib/shadow';
import { LearnedGrowthResponse } from '@/models/aiService';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import { Platform, Text, View } from 'react-native';
import ThreeDotsLoader from '../../ThreeDotLoader';

type Props = {
   data?: LearnedGrowthResponse | null;
   streamingText?: string;
   loading?: boolean;
   error?: string | null;
};

type Score = 'optimistic' | 'mixed' | 'pessimistic' | null | undefined | string;

export function AiInsightCard({
   data,
   streamingText,
   loading,
   error,
}: Props) {

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iosShadowSm = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'sm' }),
      [isDark]
   );
   
   // Helper to get Tailwind Classes for chips
   const getScoreChip = (score: Score) => {
      const baseContainer = "px-2 py-0.5 rounded-full border items-center flex-row gap-1.5 self-start";
      const baseText = "text-[11px] font-semibold";

      switch (score) {
         case 'optimistic':
            return {
               label: 'Optimistic',
               container: `${baseContainer} bg-dispute-bg border-dispute-cta`, // Using semantic brand colors
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
               label: 'Mixed view',
               container: `${baseContainer} bg-zinc-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600`,
               text: `${baseText} text-slate-900 dark:text-slate-100`,
            };
         default:
            return {
               label: 'No clear pattern',
               container: `${baseContainer} bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700`,
               text: `${baseText} text-slate-600 dark:text-slate-300`,
            };
      }
   };

   // --- Error State ---
   if (error) {
      return (
         <View className="p-4 rounded-2xl bg-belief-bg border border-belief-border gap-2">
            <Text className="text-lg font-bold text-belief-text">
               AI couldn’t respond
            </Text>
            <Text className="text-sm text-belief-text">
               {error}
            </Text>
         </View>
      );
   }

   // --- Loading / Streaming State ---
   const MAX_VISIBLE_CHARS = 250;
   const renderStreamingText =
      streamingText && streamingText.length > MAX_VISIBLE_CHARS
         ? '…' + streamingText.slice(-MAX_VISIBLE_CHARS)
         : streamingText;

   if (!data) {
      return (
         <View className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 gap-3">
            <ThreeDotsLoader />
            <View className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
               <Text className="text-xs tracking-wider text-slate-600 dark:text-slate-300 mb-1 uppercase font-semibold">
                  Received data
               </Text>
               <Text 
                  className="text-xs text-slate-900 dark:text-slate-100 leading-5"
                  style={{
                     fontFamily: Platform.select({
                        ios: 'Menlo',
                        android: 'monospace',
                        default: 'Courier',
                     })
                  }}
               >
                  {renderStreamingText}
               </Text>
            </View>
         </View>
      );
   }

   const { safety, analysis, suggestions } = data;
   const { dimensions: dims, emotionalLogic } = analysis;
   const showCrisis = safety.isCrisis;

   const permanenceChip = getScoreChip(dims.permanence.score);
   const pervasivenessChip = getScoreChip(dims.pervasiveness.score);
   const personalizationChip = getScoreChip(dims.personalization.score);

   return (
      <View className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 gap-3">
         {/* Crisis banner */}
         {showCrisis && (
            <View className="rounded-xl p-3 bg-belief-bg border border-belief-border mb-1">
               <Text className="text-base font-semibold text-belief-text mb-0.5">
                  You deserve support
               </Text>
               <Text className="text-sm text-belief-text">
                  {safety.crisisMessage || 'It sounds like you might be in crisis. Please reach out to local emergency services or a crisis line right away.'}
               </Text>
            </View>
         )}

         {/* Emotional validation */}
         <View className="mt-1 gap-1.5">
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
               Your reaction makes sense
            </Text>
            {!!emotionalLogic && (
               <Text className="text-sm text-slate-900 dark:text-slate-100 leading-5">
                  {emotionalLogic}
               </Text>
            )}
         </View>

         {/* How your mind is seeing this */}
         <View className="mt-1 gap-1.5">
            <Text className="text-base font-semibold text-slate-600 dark:text-slate-300">
               How your mind is seeing this
            </Text>

            {/* Permanence */}
            <View
               className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm gap-1.5"
               style={iosShadowSm}
            >
               <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                     How long it feels
                  </Text>
                  <View className={permanenceChip.container}>
                     <Text className={permanenceChip.text}>
                        {permanenceChip.label}
                     </Text>
                  </View>
               </View>
               <Text className="text-sm text-slate-900 dark:text-slate-100">
                  {dims.permanence.insight || 'No clear pattern here.'}
               </Text>
            </View>

            {/* Pervasiveness */}
            <View
               className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm gap-1.5"
               style={iosShadowSm}
            >
               <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                     How big it feels
                  </Text>
                  <View className={pervasivenessChip.container}>
                     <Text className={pervasivenessChip.text}>
                        {pervasivenessChip.label}
                     </Text>
                  </View>
               </View>
               <Text className="text-sm text-slate-900 dark:text-slate-100">
                  {dims.pervasiveness.insight || 'No clear pattern here.'}
               </Text>
            </View>

            {/* Personalization */}
            <View
               className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm gap-1.5"
               style={iosShadowSm}
            >
               <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                     Where blame goes
                  </Text>
                  <View className={personalizationChip.container}>
                     <Text className={personalizationChip.text}>
                        {personalizationChip.label}
                     </Text>
                  </View>
               </View>
               <Text className="text-sm text-slate-900 dark:text-slate-100">
                  {dims.personalization.insight || 'No clear pattern here.'}
               </Text>
            </View>
         </View>

         {/* Another way to talk to yourself */}
         {suggestions.counterBelief ? (
            <View className="mt-1 gap-1.5">
               <Text className="text-base font-semibold text-slate-600 dark:text-slate-300">
                  Another way to see it
               </Text>
               <View className="p-3 rounded-xl bg-zinc-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 mt-1">
                  <Text className="text-sm text-slate-900 dark:text-slate-100 leading-5">
                     {suggestions.counterBelief}
                  </Text>
               </View>
            </View>
         ) : null}
      </View>
   );
}
