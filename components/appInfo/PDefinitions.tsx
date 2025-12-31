import { Text, View } from 'react-native';

export function PInsightCard({ context = 'entry' as 'entry' | 'week' }) {
   
   // 1. Define the text for each context to keep JSX clean
   const text = {
      entry: {
         title: "Your words are clues",
         intro: "The way you explain what happened reveals your perspective. We looked at your words to see how you viewed this specific event in three ways.",
         permanence: "Did you explain this as a temporary occurrence, or something that will last a long time?",
         pervasiveness: "Did you describe this as happening in just this one area, or affecting everything you do?",
         personalization: "Did you link the cause to what you did (your actions), or who you are (your character)?"
      },
      week: {
         title: "Your Weekly Thinking Pattern",
         intro: "Across your entries this week, we looked for habits in how you explain ups and downs.",
         permanence: "Do you tend to view problems as permanent roadblocks, or temporary bumps?",
         pervasiveness: "Do you tend to connect events to everything you do, or do you see them as isolated?",
         personalization: "Is your habit to look for causes in who you are, or in what you did?"
      }
   }[context];

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
                  Time (Permanence)
               </Text>
               <Text className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                  {text.permanence}
               </Text>
            </View>

            {/* 2. Scope */}
            <View>
               <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                  Scope (Pervasiveness)
               </Text>
               <Text className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                  {text.pervasiveness}
               </Text>
            </View>

            {/* 3. Blame */}
            <View>
               <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                  Blame (Personalization)
               </Text>
               <Text className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                  {text.personalization}
               </Text>
            </View>

         </View>
      </View>
   );
}