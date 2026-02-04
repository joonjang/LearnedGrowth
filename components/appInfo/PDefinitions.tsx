import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export function PInsightCard({ context = 'entry' as 'entry' | 'week' }) {
   const { t } = useTranslation();

   const text = context === 'week'
      ? {
           title: t('analysis.p_definitions.week.title'),
           intro: t('analysis.p_definitions.week.intro'),
           permanence: t('analysis.p_definitions.week.permanence'),
           pervasiveness: t('analysis.p_definitions.week.pervasiveness'),
           personalization: t('analysis.p_definitions.week.personalization'),
        }
      : {
           title: t('analysis.p_definitions.entry.title'),
           intro: t('analysis.p_definitions.entry.intro'),
           permanence: t('analysis.p_definitions.entry.permanence'),
           pervasiveness: t('analysis.p_definitions.entry.pervasiveness'),
           personalization: t('analysis.p_definitions.entry.personalization'),
        };

   return (
      <View className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 gap-4">
         
         {/* Header Section */}
         <View className="pb-3 border-b border-slate-200 dark:border-slate-700">
            <View className="flex-row items-center gap-2 mb-1">
               <Text className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {text.title}
               </Text>
            </View>
            <Text className="text-xs text-slate-600 dark:text-slate-400 leading-5">
               {text.intro}
            </Text>
         </View>

         {/* The 3 Ps Definitions */}
         <View className="gap-3">
            
            {/* 1. Time */}
            <View>
               <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                  {t('analysis.p_definitions.labels.time')}
               </Text>
               <Text className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                  {text.permanence}
               </Text>
            </View>

            {/* 2. Scope */}
            <View>
               <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                  {t('analysis.p_definitions.labels.scope')}
               </Text>
               <Text className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                  {text.pervasiveness}
               </Text>
            </View>

            {/* 3. Blame */}
            <View>
               <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                  {t('analysis.p_definitions.labels.blame')}
               </Text>
               <Text className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                  {text.personalization}
               </Text>
            </View>

         </View>
      </View>
   );
}
