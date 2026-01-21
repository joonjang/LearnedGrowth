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
import { Activity, Hash, Tag, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CARD_PRESS_STYLE } from '../utils';

// --- Types ---

type StyleConfig = { label: string; color: string; bg: string };

type CategoryStat = {
   label: string;
   count: number;
   percentage: number;
   avgScore: number;
   style: StyleConfig;
};

type TagStat = {
   label: string;
   count: number;
};

type Props = {
   entries: Entry[];
   shadowStyle: any;
   isDark: boolean;
};

// --- Config ---

const STYLE_CONFIG = {
   positive: { label: 'Positive', color: '#10b981', bg: '#ecfdf5' },
   constructive: { label: 'Constructive', color: '#3b82f6', bg: '#eff6ff' },
   balanced: { label: 'Balanced', color: '#64748b', bg: '#f8fafc' },
   mixed: { label: 'Mixed', color: '#f59e0b', bg: '#fffbeb' },
   critical: { label: 'Critical', color: '#ef4444', bg: '#fef2f2' },
};

// --- Helpers ---

function getStyleFromScore(score: number): StyleConfig {
   if (score >= 8) return STYLE_CONFIG.positive;
   if (score >= 6) return STYLE_CONFIG.constructive;
   if (score >= 4) return STYLE_CONFIG.balanced;
   if (score >= 2.5) return STYLE_CONFIG.mixed;
   return STYLE_CONFIG.critical;
}

function getNumericScore(val: any): number | null {
   if (typeof val === 'number') return val;
   if (typeof val === 'string') {
      const n = parseFloat(val);
      if (!isNaN(n)) return n;
   }
   return null;
}

// --- Main Component ---

export default function MentalFcousCard({
   entries,
   shadowStyle,
   isDark,
}: Props) {
   const sheetRef = useRef<BottomSheetModal>(null);
   const insets = useSafeAreaInsets();
   const [isPressed, setIsPressed] = useState(false);

   // 1. The Observation Engine (Memoized Logic)
   const analysis = useMemo(() => {
      if (!entries || entries.length === 0) return null;

      const catMap = new Map<
         string,
         { count: number; totalScore: number; validScores: number }
      >();
      const tagMap = new Map<string, number>();

      // --- Aggregation Loop ---
      entries.forEach((e) => {
         // Category Aggregation
         const rawCat = e.aiResponse?.meta?.category;
         const cat = !rawCat || rawCat === 'Other' ? 'Other' : rawCat;

         const score = getNumericScore(e.aiResponse?.meta?.optimismScore);

         const currentCat = catMap.get(cat) || {
            count: 0,
            totalScore: 0,
            validScores: 0,
         };
         currentCat.count += 1;
         if (score !== null) {
            currentCat.totalScore += score;
            currentCat.validScores += 1;
         }
         catMap.set(cat, currentCat);

         // Tag Aggregation
         const tags = e.aiResponse?.meta?.tags || [];
         tags.forEach((t) => {
            const normalized = t.toLowerCase().trim();
            if (normalized.length > 0) {
               tagMap.set(normalized, (tagMap.get(normalized) || 0) + 1);
            }
         });
      });

      // --- Processing Categories ---
      const totalEntries = entries.length;
      const categoryStats: CategoryStat[] = [];

      catMap.forEach((val, key) => {
         const avg = val.validScores > 0 ? val.totalScore / val.validScores : 5;
         categoryStats.push({
            label: key,
            count: val.count,
            percentage: (val.count / totalEntries) * 100,
            avgScore: avg,
            style: getStyleFromScore(avg),
         });
      });

      // Sort Descending by Count
      categoryStats.sort((a, b) => b.count - a.count);

      // --- Processing Tags ---
      const tagStats: TagStat[] = [];
      tagMap.forEach((count, label) => {
         if (count > 1) {
            tagStats.push({ label, count });
         }
      });
      tagStats.sort((a, b) => b.count - a.count);

      // --- Determining Narrative State ---
      const topCat = categoryStats[0];

      const isCategoryTie =
         categoryStats.length > 1 &&
         categoryStats[0].count === categoryStats[1].count;

      const topTag = tagStats.length > 0 ? tagStats[0] : null;
      const isTagTie =
         tagStats.length > 1 && tagStats[0].count === tagStats[1].count;

      return {
         categoryStats,
         tagStats,
         topCat,
         isCategoryTie,
         topTag,
         isTagTie,
      };
   }, [entries]);

   // 2. Interaction Handlers
   const handlePresentModal = useCallback(() => {
      sheetRef.current?.present();
   }, []);

   const handleCloseModal = useCallback(() => {
      sheetRef.current?.dismiss();
   }, []);

   const handlePressIn = useCallback(() => {
      setIsPressed(true);
   }, []);

   const handlePressOut = useCallback(() => {
      setIsPressed(false);
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

   if (!analysis) return null;

   const { categoryStats, tagStats, topCat, isCategoryTie, topTag, isTagTie } =
      analysis;

   // Helper to determine what text to show for the category
   const getCategoryText = () => {
      if (isCategoryTie) return 'multiple topics';
      if (topCat.label === 'Other') return 'various topics';
      return topCat.label;
   };

   return (
      <>
         <Pressable
            onPress={handlePresentModal}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
         >
            <View
               className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
               style={[
                  shadowStyle.ios,
                  shadowStyle.android,
                  isPressed && CARD_PRESS_STYLE.cardPressed,
               ]}
            >
               {/* Header */}
               <View className="flex-row items-center gap-2 mb-4">
                  <Activity size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                     Mental Focus
                  </Text>
               </View>

               {/* Visual Bar */}
               <View className="flex-row h-3 rounded-full overflow-hidden mb-4 w-full bg-slate-100 dark:bg-slate-700">
                  {categoryStats.map((stat, idx) => (
                     <View
                        key={stat.label}
                        style={{
                           flex: stat.percentage,
                           backgroundColor: stat.style.color,
                           marginRight:
                              idx === categoryStats.length - 1 ? 0 : 2,
                        }}
                     />
                  ))}
               </View>

               {/* Dynamic Narrative Generation */}
               <Text className="text-base font-medium text-slate-700 dark:text-slate-200 leading-6">
                  In the entries observed,{' '}
                  <Text className="font-bold text-slate-900 dark:text-white">
                     {getCategoryText()}
                  </Text>{' '}
                  {isCategoryTie ? 'shared focus' : 'was the primary focus'}
                  {/* Tag Injection */}
                  {topTag ? (
                     <>
                        {', often mentioning '}
                        <Text className="italic text-slate-800 dark:text-slate-100">
                           {isTagTie ? `'various themes'` : `'${topTag.label}'`}
                        </Text>
                     </>
                  ) : null}
                  . The analysis suggests{' '}
                  {isCategoryTie ? (
                     <Text>a mix of patterns</Text>
                  ) : (
                     <>
                        a{' '}
                        <Text
                           style={{
                              color: topCat.style.color,
                              fontWeight: 'bold',
                           }}
                        >
                           {topCat.style.label}
                        </Text>{' '}
                        explanation style
                     </>
                  )}{' '}
                  in this area.
               </Text>
            </View>
         </Pressable>

         {/* 4. Bottom Sheet Details */}
         <BottomSheetModal
            ref={sheetRef}
            index={0}
            enableDynamicSizing
            enablePanDownToClose
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
                  paddingBottom: insets.bottom + 20,
               }}
            >
               {/* Sheet Header */}
               <View className="flex-row items-center justify-between mb-6 mt-2">
                  <View>
                     <Text className="text-xl font-bold text-slate-900 dark:text-white">
                        Observed Patterns
                     </Text>
                     <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Breakdown by topic and style
                     </Text>
                  </View>
                  <Pressable
                     onPress={handleCloseModal}
                     className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                  >
                     <X size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  </Pressable>
               </View>

               {/* Recurring Themes Row (Tags) */}
               {tagStats.length > 0 && (
                  <View className="mb-6">
                     <View className="flex-row items-center gap-1.5 mb-3">
                        <Hash
                           size={14}
                           color={isDark ? '#94a3b8' : '#64748b'}
                        />
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                           Recurring Themes
                        </Text>
                     </View>
                     <View className="flex-row flex-wrap gap-2">
                        {tagStats.slice(0, 5).map((tag) => (
                           <View
                              key={tag.label}
                              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                           >
                              <Tag
                                 size={12}
                                 color={isDark ? '#cbd5e1' : '#64748b'}
                              />
                              <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                 {tag.label}
                              </Text>
                              <View className="bg-white dark:bg-slate-700 px-1.5 rounded ml-1">
                                 <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-300">
                                    {tag.count}
                                 </Text>
                              </View>
                           </View>
                        ))}
                     </View>
                  </View>
               )}

               {/* List of Categories Breakdown */}
               <View className="gap-3">
                  {categoryStats.map((stat) => (
                     <View
                        key={stat.label}
                        className="flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700"
                     >
                        {/* Left: Dot & Name */}
                        <View className="flex-row items-center gap-3">
                           <View
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: stat.style.color }}
                           />
                           <View>
                              <Text className="text-base font-bold text-slate-900 dark:text-white">
                                 {stat.label}
                              </Text>
                              <Text className="text-xs text-slate-500 dark:text-slate-400">
                                 {stat.count}{' '}
                                 {stat.count === 1 ? 'entry' : 'entries'} (
                                 {Math.round(stat.percentage)}%)
                              </Text>
                           </View>
                        </View>

                        {/* Right: Style Label */}
                        <View
                           className="px-2.5 py-1 rounded-md"
                           style={{
                              backgroundColor: isDark
                                 ? undefined
                                 : `${stat.style.color}15`,
                              borderWidth: 1,
                              borderColor: isDark
                                 ? stat.style.color
                                 : 'transparent',
                           }}
                        >
                           <Text
                              className="text-xs font-bold"
                              style={{ color: stat.style.color }}
                           >
                              {stat.style.label}
                           </Text>
                        </View>
                     </View>
                  ))}
               </View>
            </BottomSheetScrollView>
         </BottomSheetModal>
      </>
   );
}
