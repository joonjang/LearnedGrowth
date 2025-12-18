import { getIosShadowStyle } from '@/lib/shadow';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import { AiInsightCard } from '@/components/entries/dispute/AiIngsightCard';
import { LearnedGrowthResponse } from '@/models/aiService';
import { Entry } from '@/models/entry';
import { useColorScheme } from 'nativewind';

type Props = {
   entry: Entry;
   aiData?: LearnedGrowthResponse | null;
   loading: boolean;
   error?: string | null;
   streamingText?: string;
   contentTopPadding?: number;
   onExit?: () => void;
    onGoToSteps?: () => void;
};

export default function ABCAnalysis({
   entry,
   aiData,
   loading,
   error,
   streamingText,
   contentTopPadding,
   onExit,
   onGoToSteps
}: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#f8fafc' : '#0f172a'; // text vs text-inverse
   const iosShadowSm = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'sm' }),
      [isDark]
   );
   return (
      <ScrollView
         className="flex-1"
         contentContainerStyle={{
            paddingTop: contentTopPadding ?? 24,
            paddingBottom: 48,
            flexGrow: 1,
            justifyContent: 'space-between',
            gap: 16,
            padding: 2
         }}
         keyboardShouldPersistTaps="always"
         showsVerticalScrollIndicator={false}
      >
         {/* Header */}
         <View className="flex-row items-center justify-between py-2">

               <Text className="text-base px-5 font-medium text-slate-900 dark:text-slate-100">
                  AI Insight
               </Text>

               {onExit && (
                  <RoundedCloseButton onPress={onExit} />
               )}

         </View>

         <View className="flex-1 shadow-sm dark:shadow-none" style={iosShadowSm}>
            {/* Context Box */}
            <View className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-2.5">
               <View className="gap-1">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                     Adversity
                  </Text>
                  <Text className="text-base text-slate-900 dark:text-slate-100 leading-relaxed">
                     {entry.adversity}
                  </Text>
               </View>

               <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-0.5" />

               <View className="gap-1">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                     Belief
                  </Text>
                  <Text className="text-base text-slate-900 dark:text-slate-100 leading-relaxed">
                     {entry.belief}
                  </Text>
               </View>

               {entry.consequence && (
                  <>
                     <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-0.5" />
                     <View className="gap-1">
                        <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                           Consequence
                        </Text>
                        <Text className="text-base text-slate-900 dark:text-slate-100 leading-relaxed">
                           {entry.consequence}
                        </Text>
                     </View>
                  </>
               )}
            </View>
         </View>

         <View className="flex-1 shadow-sm dark:shadow-none" style={iosShadowSm}>
            <AiInsightCard
               data={aiData}
               streamingText={streamingText}
               loading={loading}
               error={error}
            />
            {onGoToSteps && aiData ? (
               <Pressable 
                  className="mt-4 py-2.5 px-3 rounded-full bg-dispute-cta items-center justify-center shadow-sm active:opacity-90"
                  style={iosShadowSm}
                  onPress={onGoToSteps}
               >
                  <Text className="text-base font-semibold text-white">
                     Dispute your belief
                  </Text>
               </Pressable>
            ) : null}
         </View>
      </ScrollView>
   );
}
