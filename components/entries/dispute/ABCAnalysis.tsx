import { getShadow } from '@/lib/shadow';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import WideButton from '@/components/buttons/WideButton';
import { AiInsightCard } from '@/components/entries/dispute/AiInsightCard';
import { LearnedGrowthResponse } from '@/models/aiService';
import { Entry } from '@/models/entry';
import { ArrowRight } from 'lucide-react-native';
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
   onRefresh: () => void;
   retryCount: number;
   maxRetries: number;
};

export default function ABCAnalysis({
   entry,
   aiData,
   loading,
   error,
   streamingText,
   contentTopPadding,
   onExit,
   onGoToSteps,
   onRefresh,
   retryCount,
   maxRetries,
}: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const shadow = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
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
            padding: 2,
         }}
         keyboardShouldPersistTaps="always"
         showsVerticalScrollIndicator={false}
      >
         {/* Header */}
         <View className="flex-row items-center justify-between py-2">
            <Text className="text-base px-5 font-medium text-slate-900 dark:text-slate-100">
               AI Insight
            </Text>

            {onExit && <RoundedCloseButton onPress={onExit} />}
         </View>

         <View
            className={`flex-1 ${shadow.className}`}
            style={[shadow.ios, shadow.android]}
         >
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

         <View
            className={`flex-1 ${shadow.className}`}
            style={[shadow.ios, shadow.android]}
         >
            <AiInsightCard
               data={aiData}
               streamingText={streamingText}
               loading={loading}
               error={error}
               onRefresh={onRefresh}
               retryCount={retryCount}
               maxRetries={maxRetries}
               updatedAt={entry.updatedAt}
            />
            {onGoToSteps && aiData ? (
               <View
                  className={`p-1 mt-6 mb-3 ${shadow.className}`}
                  style={[shadow.ios, shadow.android]}
               >
                  <WideButton
                     label={'Continue'}
                     icon={ArrowRight}
                     onPress={onGoToSteps}
                     variant={'primary'}
                  />
               </View>
            ) : null}
         </View>
      </ScrollView>
   );
}
