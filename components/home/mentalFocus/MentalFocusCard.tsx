import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
   Activity,
   Asterisk,
   BookOpen,
   Briefcase,
   CircleDollarSign,
   Dumbbell,
   Heart,
   HelpCircle,
   User,
   Zap,
} from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Entry } from '@/models/entry';
import { MentalFocusStat, MentalFocusViewModel } from '../types';
import { CARD_PRESS_STYLE } from '../utils';
import { MentalFocusSheet } from './MentalFocusSheet';

const getCategoryIcon = (category: string) => {
   switch (category) {
      case 'Work':
         return Briefcase;
      case 'Education':
         return BookOpen;
      case 'Relationships':
         return Heart;
      case 'Health':
         return Dumbbell;
      case 'Finance':
         return CircleDollarSign;
      case 'Self-Image':
         return User;
      case 'Daily Hassles':
         return Zap;
      case 'Other':
         return Asterisk;
      default:
         return HelpCircle;
   }
};

type Props = {
   analysis: MentalFocusViewModel;
   entries: Entry[];
   shadowStyle: any;
   isDark: boolean;
   onDeleteEntry: (entry: Entry) => void;
};

export default function MentalFocusCard({
   analysis,
   entries,
   shadowStyle,
   isDark,
   onDeleteEntry,
}: Props) {
   const sheetRef = useRef<BottomSheetModal>(null);
   const [isPressed, setIsPressed] = useState(false);

   const handlePresentModal = useCallback(
      () => sheetRef.current?.present(),
      [],
   );

   if (!analysis) return null;

   const { categoryStats, narrative } = analysis;
   const TopIcon = getCategoryIcon(narrative.topCatLabel);

   return (
      <>
         <Pressable
            onPress={handlePresentModal}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
         >
            <View
               className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
               style={[
                  shadowStyle.ios,
                  shadowStyle.android,
                  isPressed && CARD_PRESS_STYLE.cardPressed,
               ]}
            >
               {/* Header Section */}
               <View className="flex-row items-center justify-between mb-5">
                  <View className="flex-row items-center gap-2">
                     <Activity
                        size={16}
                        color={isDark ? '#cbd5e1' : '#64748b'}
                     />
                     <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Mental Focus
                     </Text>
                  </View>
               </View>

               {/* Main Observation Section (Option 1) */}
               <View className="flex-row items-start gap-4 mb-6">
                  <View className="h-14 w-14 items-center justify-center bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-100 dark:border-slate-700">
                     <TopIcon
                        size={28}
                        color={isDark ? '#e2e8f0' : '#334155'}
                        strokeWidth={2}
                     />
                  </View>

                  <View className="flex-1 gap-y-1.5">
                     {/* Bullet 1: Recurring Theme */}
                     <View className="flex-row items-center gap-2">
                        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight w-32">
                           Recurring Theme
                        </Text>
                        <Text className="text-sm font-bold text-slate-900 dark:text-white flex-1">
                           {narrative.topCatLabel}
                        </Text>
                     </View>

                     {/* Bullet 2: Describing Style */}
                     <View className="flex-row items-center gap-2">
                        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight w-32">
                           Describing Style
                        </Text>

                        <Text
                           className="text-sm font-semibold text-slate-600 dark:text-slate-300"
                           style={{ color: narrative.styleColor }}
                        >
                           {narrative.styleLabel}
                        </Text>
                     </View>

                     {/* Bullet 3: Detected Tone */}
                     <View className="flex-row items-center gap-2">
                        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight w-32">
                           Detected Tone
                        </Text>
                        <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                           {/* Based on the sentiment color, we can derive a tone word */}
                           {narrative.styleLabel === 'Positive' ||
                           narrative.styleLabel === 'Constructive'
                              ? 'Optimistic'
                              : 'Pessimistic'}
                        </Text>
                     </View>
                  </View>
               </View>

               {/* Distribution Bar */}
               <View className="mb-4">
                  <View className="flex-row h-1.5 rounded-full overflow-hidden w-full bg-slate-100 dark:bg-slate-700">
                     {categoryStats.map(
                        (stat: MentalFocusStat, idx: number) => (
                           <View
                              key={stat.label}
                              style={{
                                 flex: stat.percentage,
                                 backgroundColor: stat.style.color,
                                 marginRight:
                                    idx === categoryStats.length - 1 ? 0 : 1,
                              }}
                           />
                        ),
                     )}
                  </View>
               </View>

               {/* Legend Tags */}
               <View className="flex-row flex-wrap gap-x-4 gap-y-2">
                  {categoryStats.slice(0, 4).map((stat: MentalFocusStat) => (
                     <View
                        key={stat.label}
                        className="flex-row items-center gap-1.5"
                     >
                        <View
                           className="w-1.5 h-1.5 rounded-full"
                           style={{ backgroundColor: stat.style.color }}
                        />
                        <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                           {stat.label}{' '}
                           <Text className="font-bold text-slate-400 dark:text-slate-500">
                              {Math.round(stat.percentage)}%
                           </Text>
                        </Text>
                     </View>
                  ))}
               </View>
            </View>
         </Pressable>

         <MentalFocusSheet
            sheetRef={sheetRef}
            analysis={analysis}
            entries={entries}
            isDark={isDark}
            onDeleteEntry={onDeleteEntry}
         />
      </>
   );
}
