import {
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import EntryCard from '@/components/entries/entry/EntryCard';
import {
   ALERT_COLOR_DARK,
   ALERT_COLOR_LIGHT,
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   BOTTOM_SHEET_CONTENT_PADDING,
} from '@/lib/styles'; // Removed BOTTOM_SHEET_MAX_SNAP
import { Entry } from '@/models/entry';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { AlertCircle } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ResolutionNeedsAttentionSheetProps = {
   sheetRef: React.RefObject<BottomSheetModal | null>;
   entries: Entry[];
   totalCount: number;
   isDark: boolean;
   onDeleteEntry: (entry: Entry) => void;
};

export default function NeedsAttentionSheet({
   sheetRef,
   entries,
   totalCount,
   isDark,
   onDeleteEntry,
}: ResolutionNeedsAttentionSheetProps) {
   const insets = useSafeAreaInsets();
   const { height: windowHeight } = useWindowDimensions();
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);

   // This sets the maximum possible height (90% of screen)
   const maxSheetHeight = useMemo(() => windowHeight * 0.9, [windowHeight]);

   // REMOVED: snapPoints memo.
   // We want the sheet to size itself dynamically up to maxSheetHeight.

   const summaryText = useMemo(() => {
      if (totalCount === 0) {
         return 'Add entries to start tracking disputes.';
      }
      if (entries.length === 0) {
         return 'All caught up. Every recent entry has a dispute.';
      }
      return `${entries.length} of your last ${totalCount} entries need a dispute.`;
   }, [entries.length, totalCount]);

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
      sheetRef.current?.dismiss();
   }, [handleCloseMenu, sheetRef]);

   const handleSheetDismiss = useCallback(() => {
      setOpenMenuEntryId(null);
   }, []);

   return (
      <BottomSheetModal
         ref={sheetRef}
         onDismiss={handleSheetDismiss}
         index={0}
         // REMOVED: snapPoints={snapPoints}
         enableDynamicSizing={true}
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
            <View className="mb-4">
               <View className="flex-row items-center gap-2 mb-1">
                  <AlertCircle
                     size={14}
                     color={isDark ? ALERT_COLOR_DARK : ALERT_COLOR_LIGHT}
                  />
                  <Text className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                     Needs Attention
                  </Text>
               </View>
               <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Entries Without Disputes
               </Text>
               <Text className="text-sm text-slate-500 dark:text-slate-400">
                  {summaryText}
               </Text>
            </View>

            {entries.length > 0 ? (
               <View className="gap-3">
                  {entries.map((entry) => (
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
                           onNavigate={handleNavigate}
                        />
                     </Animated.View>
                  ))}
               </View>
            ) : (
               <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                  <Text className="text-sm text-slate-500 dark:text-slate-400">
                     No entries need a dispute right now.
                  </Text>
               </View>
            )}
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
