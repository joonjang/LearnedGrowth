import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AiInsightCard } from '@/components/entries/dispute/AiIngsightCard';
import { LearnedGrowthResponse } from '@/models/aiService';
import { Entry } from '@/models/entry';
import { Ionicons } from '@expo/vector-icons';
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
   return (
      <ScrollView
         className="flex-1"
         contentContainerStyle={{
            paddingTop: contentTopPadding ?? 24,
            paddingBottom: 48,
            flexGrow: 1,
            justifyContent: 'space-between',
            gap: 16,
         }}
         keyboardShouldPersistTaps="always"
         showsVerticalScrollIndicator={false}
      >
         {/* Header */}
         <View className="flex-row items-center justify-between py-2">
            <View className="flex-row items-center py-2">
               <Text className="text-base font-medium text-text">
                  AI Insight
               </Text>

               {onExit && (
                  <Pressable
                     onPress={onExit}
                     hitSlop={12}
                     className="p-2 rounded-2xl border border-border bg-card-bg items-center justify-center active:opacity-70"
                  >
                     <Ionicons name="close" size={22} color={iconColor} />
                  </Pressable>
               )}
            </View>
         </View>

         <View className="flex-1 shadow-sm dark:shadow-none">
            {/* Context Box */}
            <View className="p-3 rounded-xl bg-card-grey border border-border gap-2.5">
               <View className="gap-1">
                  <Text className="text-xs font-bold text-text-subtle uppercase tracking-widest">
                     Adversity
                  </Text>
                  <Text className="text-base text-text leading-relaxed">
                     {entry.adversity}
                  </Text>
               </View>

               <View className="h-[1px] bg-border my-0.5" />

               <View className="gap-1">
                  <Text className="text-xs font-bold text-text-subtle uppercase tracking-widest">
                     Belief
                  </Text>
                  <Text className="text-base text-text leading-relaxed">
                     {entry.belief}
                  </Text>
               </View>

               {entry.consequence && (
                  <>
                     <View className="h-[1px] bg-border my-0.5" />
                     <View className="gap-1">
                        <Text className="text-xs font-bold text-text-subtle uppercase tracking-widest">
                           Consequence
                        </Text>
                        <Text className="text-base text-text leading-relaxed">
                           {entry.consequence}
                        </Text>
                     </View>
                  </>
               )}
            </View>
         </View>

         <View className="flex-1 shadow-sm dark:shadow-none">
            <AiInsightCard
               data={aiData}
               streamingText={streamingText}
               loading={loading}
               error={error}
            />
            {onGoToSteps && aiData ? (
               <Pressable 
                  className="mt-4 py-2.5 px-3 rounded-full bg-disputeCTA items-center justify-center shadow-sm active:opacity-90"
                  onPress={onGoToSteps}
               >
                  <Text className="text-base font-semibold text-ctaText">
                     Dispute your belief
                  </Text>
               </Pressable>
            ) : null}
         </View>
      </ScrollView>
   );
}
