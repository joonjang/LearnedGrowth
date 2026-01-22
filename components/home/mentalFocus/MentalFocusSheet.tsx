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
import EntryCard from '@/components/entries/entry/EntryCard';
import { Entry } from '@/models/entry';
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Tag, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, {
    FadeInRight,
    FadeInUp,
    LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    MentalFocusStat,
    MentalFocusTagStat,
    MentalFocusViewModel,
} from '../types';

type MentalFocusSheetProps = {
   sheetRef: React.RefObject<BottomSheetModal | null>;
   analysis: MentalFocusViewModel;
   entries: Entry[];
   isDark: boolean;
   onDeleteEntry: (entry: Entry) => void;
};

export function MentalFocusSheet({
   sheetRef,
   analysis,
   entries,
   isDark,
   onDeleteEntry,
}: MentalFocusSheetProps) {
   const insets = useSafeAreaInsets();
   const { height: windowHeight } = useWindowDimensions();

   const [activeFilter, setActiveFilter] = useState<string | null>(null);
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);

   const maxSheetHeight = useMemo(() => windowHeight * 0.9, [windowHeight]);

   const filteredEntries = useMemo(() => {
      if (!activeFilter || !entries) return [];
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

   const handleTopicPress = useCallback((val: string) => {
      setActiveFilter((prev) => (prev === val ? null : val));
      setOpenMenuEntryId(null);
   }, []);

   const handleToggleMenu = useCallback((entryId: string) => {
      setOpenMenuEntryId((current) => (current === entryId ? null : entryId));
   }, []);

   const handleCloseMenu = useCallback(() => {
      setOpenMenuEntryId(null);
   }, []);

   const handleDelete = useCallback(
      (entry: Entry) => {
         handleCloseMenu();
         onDeleteEntry?.(entry);
      },
      [handleCloseMenu, onDeleteEntry],
   );

   // LEARNED FROM DayDetailSheet:
   // Just dismiss the sheet and let EntryCard handle the internal navigation.
   const handleNavigate = useCallback(
      (_entry: Entry) => {
         setOpenMenuEntryId(null);
         sheetRef.current?.dismiss();
      },
      [sheetRef],
   );

   const handleSheetDismiss = useCallback(() => {
      setActiveFilter(null);
      setOpenMenuEntryId(null);
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
   const { categoryStats, tagStats } = analysis;

   return (
      <BottomSheetModal
         ref={sheetRef}
         index={0}
         enableDynamicSizing
         maxDynamicContentSize={maxSheetHeight}
         enablePanDownToClose
         onDismiss={handleSheetDismiss}
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
            keyboardShouldPersistTaps="handled"
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
               <TouchableOpacity
                  onPress={() => sheetRef.current?.dismiss()}
                  className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
               >
                  <X size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
               </TouchableOpacity>
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
                              className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
                                 isActive
                                    ? 'bg-indigo-600 border-indigo-600'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`}
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
                           </TouchableOpacity>
                        </Animated.View>
                     );
                  })}
            </View>

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
                        className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                           isActive
                              ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                        }`}
                     >
                        <View className="flex-row items-center gap-3">
                           <View
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: stat.style.color }}
                           />
                           <Text className="text-base font-bold text-slate-900 dark:text-white">
                              {stat.label}
                           </Text>
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

            {activeFilter && (
               <Animated.View entering={FadeInUp} className="mt-8">
                  <View className="flex-row items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                     <Text className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                        Showing Topic: {activeFilter}
                     </Text>
                     <TouchableOpacity onPress={() => setActiveFilter(null)}>
                        <Text className="text-xs font-bold text-slate-400">
                           Clear
                        </Text>
                     </TouchableOpacity>
                  </View>

                  <View className="gap-3">
                     {filteredEntries.map((entry) => (
                        <Animated.View
                           key={entry.id}
                           layout={LinearTransition.duration(180)}
                        >
                           <EntryCard
                              entry={entry}
                              isMenuOpen={openMenuEntryId === entry.id}
                              onToggleMenu={() => handleToggleMenu(entry.id)}
                              onCloseMenu={handleCloseMenu}
                              onDelete={handleDelete}
                              onNavigate={handleNavigate} // Using the passive navigation handler
                           />
                        </Animated.View>
                     ))}
                  </View>
               </Animated.View>
            )}
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
