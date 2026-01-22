import {
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import {
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_CONTENT_PADDING,
} from '@/components/constants';
import { Entry } from '@/models/entry';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import {
   Activity,
   Asterisk,
   BookOpen,
   Briefcase,
   Calendar,
   ChevronRight,
   CircleDollarSign,
   Dumbbell,
   Heart,
   HelpCircle,
   Tag,
   User,
   X,
   Zap,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
   FadeInRight,
   FadeInUp,
   Layout,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
   MentalFocusStat,
   MentalFocusTagStat,
   MentalFocusViewModel,
} from '../types';
import { CARD_PRESS_STYLE } from '../utils';

// --- ICON MAPPING ---
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
};

export default function MentalFocusCard({
   analysis,
   entries,
   shadowStyle,
   isDark,
}: Props) {
   const sheetRef = useRef<BottomSheetModal>(null);
   const insets = useSafeAreaInsets();
   const [isPressed, setIsPressed] = useState(false);
   const [activeFilter, setActiveFilter] = useState<string | null>(null);

   const filteredEntries = useMemo(() => {
      if (!activeFilter) return [];
      return entries
         .filter((e) => {
            const cat = e.aiResponse?.meta?.category;
            const tags = e.aiResponse?.meta?.tags || [];
            return cat === activeFilter || tags.includes(activeFilter);
         })
         .sort(
            (a, b) =>
               new Date(b.createdAt).getTime() -
               new Date(a.createdAt).getTime(),
         );
   }, [activeFilter, entries]);

   // --- HANDLERS ---
   const handlePresentModal = useCallback(() => {
      sheetRef.current?.present();
   }, []);

   const handleCloseModal = useCallback(() => {
      sheetRef.current?.dismiss();
   }, []);

   const handleTopicPress = useCallback((filterValue: string) => {
      setActiveFilter((prev) => (prev === filterValue ? null : filterValue));
   }, []); // Removed 'activeFilter' from dependency array to fix ESLint warning

   const handleViewEntry = useCallback((entryId: string) => {
      sheetRef.current?.dismiss();
      router.push({ pathname: '/entries/[id]', params: { id: entryId } });
   }, []);

   const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
         <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={BOTTOM_SHEET_BACKDROP_OPACITY}
            pressBehavior="close"
         />
      ),
      [],
   );

   // --- GUARD & DATA PREP ---
   // Since analysis is MentalFocusViewModel | null, we guard here
   if (!analysis) return null;

   // Now TS knows analysis is NOT null, destructuring is safe
   const { categoryStats, tagStats, narrative } = analysis;

   const TopIcon = getCategoryIcon(narrative.topCatLabel);
   const primaryColor = narrative.styleColor;

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
               <View className="flex-row items-center gap-2 mb-5">
                  <Activity size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                     Mental Focus
                  </Text>
               </View>

               <View className="flex-row justify-between items-center mb-6">
                  <View className="flex-row items-center gap-3 flex-1">
                     <View className="h-12 w-12 items-center justify-center bg-slate-100 dark:bg-slate-700/60 rounded-2xl">
                        <TopIcon
                           size={24}
                           color={isDark ? '#e2e8f0' : '#334155'}
                           strokeWidth={2}
                        />
                     </View>
                     <View>
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                           Recurring Theme
                        </Text>
                        <Text className="text-xl font-extrabold text-slate-900 dark:text-white leading-6">
                           {narrative.topCatLabel}
                        </Text>
                     </View>
                  </View>

                  <View className="items-end pl-2">
                     <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                        Sentiment
                     </Text>
                     <View
                        className="px-2.5 py-1 rounded-lg border"
                        style={{
                           borderColor: primaryColor,
                           backgroundColor: isDark
                              ? 'transparent'
                              : `${primaryColor}10`,
                        }}
                     >
                        <Text
                           className="text-xs font-bold"
                           style={{ color: primaryColor }}
                        >
                           {narrative.styleLabel}
                        </Text>
                     </View>
                  </View>
               </View>

               <View className="mb-3">
                  <View className="flex-row h-2.5 rounded-full overflow-hidden w-full bg-slate-100 dark:bg-slate-700">
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

               <View className="flex-row flex-wrap gap-x-4 gap-y-2">
                  {categoryStats.slice(0, 4).map((stat: MentalFocusStat) => (
                     <View
                        key={stat.label}
                        className="flex-row items-center gap-1.5"
                     >
                        <View
                           className="w-2 h-2 rounded-full"
                           style={{ backgroundColor: stat.style.color }}
                        />
                        <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">
                           {stat.label}{' '}
                           <Text className="text-slate-400">
                              {Math.round(stat.percentage)}%
                           </Text>
                        </Text>
                     </View>
                  ))}
               </View>
            </View>
         </Pressable>

         <BottomSheetModal
            ref={sheetRef}
            index={0}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={() => setActiveFilter(null)}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={bottomSheetHandleIndicatorStyle(isDark)}
            backgroundStyle={bottomSheetBackgroundStyle(
               isDark,
               isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT,
            )}
         >
            <BottomSheetScrollView
               contentContainerStyle={{
                  paddingHorizontal: BOTTOM_SHEET_CONTENT_PADDING,
                  paddingTop: 12,
                  paddingBottom: insets.bottom + 20,
               }}
            >
               <View className="flex-row items-center justify-between mb-6">
                  <View>
                     <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Mental Focus
                     </Text>
                     <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Observed Patterns
                     </Text>
                  </View>
                  <Pressable
                     onPress={handleCloseModal}
                     className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                  >
                     <X size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  </Pressable>
               </View>

               <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                  Key Topics
               </Text>
               <View className="flex-row flex-wrap gap-2 mb-8">
                  {tagStats
                     .slice(0, 8)
                     .map((tag: MentalFocusTagStat, idx: number) => {
                        const isActive = activeFilter === tag.label;
                        return (
                           <Animated.View
                              entering={FadeInRight.delay(idx * 40)}
                              key={tag.label}
                           >
                              <TouchableOpacity
                                 onPress={() => handleTopicPress(tag.label)}
                                 className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${isActive ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                              >
                                 <Tag
                                    size={12}
                                    color={
                                       isActive
                                          ? 'white'
                                          : isDark
                                            ? '#cbd5e1'
                                            : '#64748b'
                                    }
                                 />
                                 <Text
                                    className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}
                                 >
                                    {tag.label}
                                 </Text>
                                 <View
                                    className={`${isActive ? 'bg-indigo-500' : 'bg-white dark:bg-slate-700'} px-1.5 py-0.5 rounded-md ml-1`}
                                 >
                                    <Text
                                       className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                       {tag.count}
                                    </Text>
                                 </View>
                              </TouchableOpacity>
                           </Animated.View>
                        );
                     })}
               </View>

               {activeFilter && (
                  <Animated.View
                     entering={FadeInUp}
                     layout={Layout.springify()}
                     className="mb-8"
                  >
                     <View className="flex-row items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <Text className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                           Entries: {activeFilter}
                        </Text>
                        <TouchableOpacity onPress={() => setActiveFilter(null)}>
                           <Text className="text-xs font-bold text-slate-400">
                              Clear Filter
                           </Text>
                        </TouchableOpacity>
                     </View>

                     <View className="gap-3">
                        {filteredEntries.map((entry) => (
                           <Pressable
                              key={entry.id}
                              onPress={() => handleViewEntry(entry.id)}
                              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex-row items-center justify-between active:opacity-70"
                           >
                              <View className="flex-1 mr-3">
                                 <View className="flex-row items-center gap-2 mb-1.5">
                                    <View className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                                       <Calendar size={10} color="#64748b" />
                                       <Text className="text-[9px] font-bold text-slate-500 uppercase">
                                          {new Date(
                                             entry.createdAt,
                                          ).toLocaleDateString('en-US', {
                                             month: 'short',
                                             day: 'numeric',
                                          })}
                                       </Text>
                                    </View>
                                 </View>
                                 <Text
                                    numberOfLines={1}
                                    className="text-sm font-bold text-slate-900 dark:text-white mb-0.5"
                                 >
                                    {entry.adversity}
                                 </Text>
                                 <Text
                                    numberOfLines={1}
                                    className="text-xs text-slate-500 dark:text-slate-400 italic"
                                 >
                                    &quot;{entry.belief}&quot;
                                 </Text>
                              </View>
                              <ChevronRight size={18} color="#cbd5e1" />
                           </Pressable>
                        ))}
                     </View>
                  </Animated.View>
               )}

               <View>
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                     Recurring Themes
                  </Text>
                  <View className="gap-3">
                     {categoryStats.map((stat: MentalFocusStat) => {
                        const isActive = activeFilter === stat.label;
                        return (
                           <TouchableOpacity
                              key={stat.label}
                              onPress={() => handleTopicPress(stat.label)}
                              className={`flex-row items-center justify-between p-4 rounded-2xl border active:opacity-70 ${isActive ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}
                           >
                              <View className="flex-row items-center gap-3">
                                 <View
                                    className="h-3 w-3 rounded-full"
                                    style={{
                                       backgroundColor: stat.style.color,
                                    }}
                                 />
                                 <View>
                                    <Text className="text-base font-bold text-slate-900 dark:text-white">
                                       {stat.label}
                                    </Text>
                                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                                       {stat.count}{' '}
                                       {stat.count === 1 ? 'entry' : 'entries'}{' '}
                                       ({Math.round(stat.percentage)}%)
                                    </Text>
                                 </View>
                              </View>

                              <View
                                 className="px-2.5 py-1 rounded-lg border"
                                 style={{
                                    borderColor: isDark
                                       ? stat.style.color
                                       : 'transparent',
                                    backgroundColor: isDark
                                       ? 'transparent'
                                       : `${stat.style.color}15`,
                                 }}
                              >
                                 <Text
                                    className="text-xs font-bold"
                                    style={{ color: stat.style.color }}
                                 >
                                    {stat.style.label}
                                 </Text>
                              </View>
                           </TouchableOpacity>
                        );
                     })}
                  </View>
               </View>
            </BottomSheetScrollView>
         </BottomSheetModal>
      </>
   );
}
