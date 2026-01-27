import {
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import EntryCard from '@/components/entries/entry/EntryCard';
import {
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   BOTTOM_SHEET_CONTENT_PADDING,
} from '@/lib/styles';
import { Entry } from '@/models/entry';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type InsightCoverageSheetProps = {
   sheetRef: React.RefObject<BottomSheetModal | null>;
   entries: Entry[];
   totalCount: number;
   isDark: boolean;
   onDeleteEntry: (entry: Entry) => void;
};

// --- Helper Component: CoverageMeter ---
function CoverageMeter({
   missing,
   total,
   isDark,
}: {
   missing: number;
   total: number;
   isDark: boolean;
}) {
   const analyzed = Math.max(0, total - missing);
   const percentage = total > 0 ? (analyzed / total) * 100 : 100;

   return (
      <View className="mb-6">
         <View className="flex-row justify-between mb-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
               Insight Coverage
            </Text>
            <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
               {Math.round(percentage)}% Analyzed
            </Text>
         </View>

         <View className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <View
               className="h-full rounded-full bg-indigo-500"
               style={{ width: `${percentage}%` }}
            />
         </View>

         <Text className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 text-right">
            {analyzed}/{total} entries included
         </Text>
      </View>
   );
}

export default function NoAiEntrySheet({
   sheetRef,
   entries,
   totalCount,
   isDark,
   onDeleteEntry,
}: InsightCoverageSheetProps) {
   const insets = useSafeAreaInsets();
   const { height: windowHeight } = useWindowDimensions();
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const dismissResolverRef = useRef<(() => void) | null>(null);

   const maxSheetHeight = useMemo(() => windowHeight * 0.9, [windowHeight]);
   const hasMissingEntries = entries.length > 0;

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

   const handleToggleMenu = useCallback((entryId: string) => {
      setOpenMenuEntryId((current) => (current === entryId ? null : entryId));
   }, []);

   const handleCloseMenu = useCallback(() => {
      setOpenMenuEntryId(null);
   }, []);

   const handleDelete = useCallback(
      (entry: Entry) => {
         handleCloseMenu();
         onDeleteEntry(entry);
      },
      [handleCloseMenu, onDeleteEntry],
   );

   const handleNavigate = useCallback(() => {
      handleCloseMenu();
      return new Promise<void>((resolve) => {
         dismissResolverRef.current = resolve;
         sheetRef.current?.dismiss();
      });
   }, [handleCloseMenu, sheetRef]);

   const handleAnalyze = useCallback(() => {
      handleCloseMenu();
      return new Promise<void>((resolve) => {
         dismissResolverRef.current = resolve;
         sheetRef.current?.dismiss();
      });
   }, [handleCloseMenu, sheetRef]);

   const handleSheetDismiss = useCallback(() => {
      setOpenMenuEntryId(null);
      dismissResolverRef.current?.();
      dismissResolverRef.current = null;
   }, []);

   return (
      <BottomSheetModal
         ref={sheetRef}
         onDismiss={handleSheetDismiss}
         index={0}
         enableDynamicSizing
         maxDynamicContentSize={maxSheetHeight}
         enablePanDownToClose
         enableOverDrag={false}
         handleIndicatorStyle={bottomSheetHandleIndicatorStyle(isDark)}
         backdropComponent={renderBackdrop}
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
            <View className="mb-2">
               <View className="flex-row items-center gap-2 mb-1">
                  <Sparkles size={16} color={isDark ? '#818cf8' : '#6366f1'} />
                  <Text className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                     Unlock Insights
                  </Text>
               </View>

               <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {hasMissingEntries
                     ? 'Include in Analysis'
                     : 'Trends Complete'}
               </Text>

               <Text className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-5">
                  {hasMissingEntries
                     ? 'See how these specific moments shape your overall trends.'
                     : 'All your recent entries are analyzed and included in your trends.'}
               </Text>

               <CoverageMeter
                  missing={entries.length}
                  total={totalCount}
                  isDark={isDark}
               />
            </View>

            {hasMissingEntries ? (
               <View className="gap-4">
                  <View className="flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                     <Text className="text-xs font-bold text-slate-400 uppercase">
                        {entries.length} Ready for Analysis
                     </Text>
                  </View>

                  {entries.map((entry) => (
                     // --- CRASH FIX: Use standard View instead of Animated.View ---
                     // Reanimated Layout Transitions inside a dismissing BottomSheet
                     // are a primary cause of the android.view.ViewGroup.dispatchGetDisplayList crash.
                     <View key={entry.id}>
                        <EntryCard
                           entry={entry}
                           isMenuOpen={openMenuEntryId === entry.id}
                           onToggleMenu={() => handleToggleMenu(entry.id)}
                           onCloseMenu={handleCloseMenu}
                           onDelete={handleDelete}
                           onNavigate={handleNavigate}
                           onAnalyze={handleAnalyze}
                           initialViewMode="original"
                        />
                     </View>
                  ))}
               </View>
            ) : (
               <View className="items-center justify-center py-8 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 border-dashed">
                  <CheckCircle2
                     size={32}
                     color={isDark ? '#818cf8' : '#6366f1'}
                  />
                  <Text className="mt-3 text-sm font-bold text-indigo-900 dark:text-indigo-200">
                     You are all caught up!
                  </Text>
               </View>
            )}
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
