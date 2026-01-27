import {
    bottomSheetBackgroundStyle,
    bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import {
    ALERT_COLOR_DARK,
    ALERT_COLOR_LIGHT,
    BOTTOM_SHEET_BACKDROP_OPACITY,
    BOTTOM_SHEET_BG_DARK,
    BOTTOM_SHEET_BG_LIGHT,
    BOTTOM_SHEET_CONTENT_PADDING,
    BOTTOM_SHEET_MAX_SNAP,
} from '@/lib/styles';
import EntryCard from '@/components/entries/entry/EntryCard';
import { Entry } from '@/models/entry';
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { AlertCircle } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DayDetailSheetProps = {
   sheetRef: React.RefObject<BottomSheetModal>;
   onDismiss: () => void;
   isDark: boolean;
   maxSheetHeight: number;
   selectedDateLabel: string;
   summaryText: string;
   incompleteEntries: Entry[];
   completedEntries: Entry[];
   onDeleteEntry?: (entry: Entry) => void;
};

export function DayDetailSheet({
   sheetRef,
   onDismiss,
   isDark,
   maxSheetHeight,
   selectedDateLabel,
   summaryText,
   incompleteEntries,
   completedEntries,
   onDeleteEntry,
}: DayDetailSheetProps) {
   const insets = useSafeAreaInsets();
   const snapPoints = useMemo(() => [BOTTOM_SHEET_MAX_SNAP], []);
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);

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
         onDeleteEntry?.(entry);
      },
      [handleCloseMenu, onDeleteEntry],
   );

   const handleNavigate = useCallback(
      (_entry: Entry) => {
         setOpenMenuEntryId(null);
         sheetRef.current?.dismiss();
      },
      [sheetRef],
   );

   const handleSheetDismiss = useCallback(() => {
      setOpenMenuEntryId(null);
      onDismiss();
   }, [onDismiss]);

   return (
      <BottomSheetModal
         ref={sheetRef}
         onDismiss={handleSheetDismiss}
         index={0}
         snapPoints={snapPoints}
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
            <View className="mb-4">
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                  Daily Snapshot
               </Text>
               <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedDateLabel || ' '}
               </Text>
               <Text className="text-sm text-slate-500 dark:text-slate-400">
                  {summaryText}
               </Text>
            </View>

            <View className="gap-6">
               {incompleteEntries.length > 0 && (
                  <View>
                     <View className="flex-row items-center gap-2 mb-2">
                        <AlertCircle
                           size={14}
                           color={isDark ? ALERT_COLOR_DARK : ALERT_COLOR_LIGHT}
                        />
                        <Text className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                           Needs Attention
                        </Text>
                     </View>

                     <View className="gap-3">
                        {incompleteEntries.map((entry) => (
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
                  </View>
               )}

               {completedEntries.length > 0 && (
                  <View>
                     <Text className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-300 mb-2">
                        Thoughts Reframed
                     </Text>
                     <View className="gap-3">
                        {completedEntries.map((entry) => (
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
                  </View>
               )}
            </View>
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
