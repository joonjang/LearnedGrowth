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

// --- Helper Component for Dimensions ---
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
      const baseContainer = "px-2 py-0.5 rounded-full border items-center flex-row gap-1.5 self-start";
      const baseText = "text-[11px] font-semibold";

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

// --- Main Component ---
export function AiInsightCard({
   data,
   streamingText,
   error,
}: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   
   // Reuse shadow for consistency
   const iosShadowSm = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'sm' }),
      [isDark]
   );

   if (error) {
      return (
         <View className="p-4 rounded-2xl bg-belief-bg border border-belief-border gap-2">
            <Text className="text-lg font-bold text-belief-text">
               AI couldn’t respond
            </Text>
            <Text className="text-sm text-belief-text opacity-90">
               {error}
            </Text>
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
               <Text 
                  className="text-[11px] text-slate-600 dark:text-slate-400 leading-4"
                  style={{
                     fontFamily: Platform.select({
                        ios: 'Menlo',
                        android: 'monospace',
                        default: 'Courier',
                     })
                  }}
               >
                  {renderStreamingText || "Connecting..."}
               </Text>
            </View>
         </View>
      );
   }

   const { safety, analysis, suggestions } = data;
   const { dimensions: dims, emotionalLogic } = analysis;

   return (
      <View className="gap-4 pb-4">
         {/* Crisis Banner */}
         {safety.isCrisis && (
            <View className="rounded-xl p-4 bg-belief-bg border border-belief-border shadow-sm">
               <Text className="text-base font-bold text-belief-text mb-1">
                  You deserve support
               </Text>
               <Text className="text-[13px] leading-5 text-belief-text">
                  {safety.crisisMessage || 'It sounds like you might be in crisis. Please reach out to local emergency services or a crisis line right away.'}
               </Text>
            </View>
         )}

         {/* Emotional Validation */}
         <View className=" py-4 px-2 ">
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

         {/* Suggestion - NEW DESIGN */}
         {suggestions.counterBelief && (
            <View className="mt-2">
               <Text className="text-[15px] font-bold text-slate-900 dark:text-slate-100 ml-1 mb-2">
                  Another way to see it
               </Text>
               
               {/* Redesign:
                  1. Switched to 'bg-white' to match other cards (removes weird contrast).
                  2. Added 'iosShadowSm' for consistent depth.
                  3. Added a green accent bar (bg-dispute-cta) to indicate growth/optimism.
                  4. Removed quotes/italics for a cleaner, authoritative look.
               */}
               <View 
                  className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
                  style={iosShadowSm}
               >
                  <View className="flex-row gap-3">
                     <Text className="flex-1 text-[15px] leading-6 font-medium text-slate-800 dark:text-slate-200">
                     &quot;{suggestions.counterBelief}&quot;
                     </Text>
                  </View>
               </View>
            </View>
         )}
      </View>
   );
}