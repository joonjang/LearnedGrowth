import LeftBackChevron from '@/components/buttons/LeftBackChevron';
import NewEntryFab from '@/components/buttons/NewEntryFAB';
import { MenuBounds } from '@/components/entries/entry/EntryCard';
import EntryRow from '@/components/entries/entry/EntryRow';
import BottomFade from '@/components/utils/BottomFade';
import { useDeletedEntries } from '@/hooks/useDeletedEntries';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { ROUTE_ENTRY_DETAIL } from '@/lib/constants';
import { getWeekLabel, getWeekStart } from '@/lib/date';
import { getShadow } from '@/lib/shadow';
import type { Entry } from '@/models/entry';
import { router, useFocusEffect } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SwipeableMethods } from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';
import Animated, {
   FadeOutUp,
   LinearTransition,
   useAnimatedScrollHandler,
   useDerivedValue,
   useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedFlatList = Animated.createAnimatedComponent(
   FlatList,
) as typeof FlatList;

// --- CONSTANTS ---
const SCROLL_THRESHOLD_FOR_FAB = 100;

export default function EntriesListScreen() {
   const store = useEntries();
   const { deletedCount, refresh: refreshDeletedEntries } = useDeletedEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { lock: lockNavigation } = useNavigationLock();

   const scrollY = useSharedValue(0);
   const scrollHandler = useAnimatedScrollHandler((event) => {
      scrollY.value = event.contentOffset.y;
   });

   const isFabVisible = useDerivedValue(() => {
      return scrollY.value > SCROLL_THRESHOLD_FOR_FAB;
   });

   // --- STATE ---
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const [, setOpenMenuBounds] = useState<MenuBounds | null>(null);
   const openSwipeableRef = useRef<{
      id: string;
      ref: SwipeableMethods;
   } | null>(null);
   const swipeGestureRef = useRef(false);

   const buttonShadow = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'sm',
         }),
      [isDark],
   );

   // --- ACTIONS ---
   const handleNewEntryPress = useCallback(() => {
      lockNavigation(() => router.push('/new'));
   }, [lockNavigation]);

   const handleBinPress = useCallback(() => {
      lockNavigation(() => router.navigate('/bin'));
   }, [lockNavigation]);

   useFocusEffect(
      useCallback(() => {
         refreshDeletedEntries();
      }, [refreshDeletedEntries]),
   );
   useEffect(() => {
      refreshDeletedEntries();
   }, [refreshDeletedEntries, store.rows.length]);

   const closeMenu = useCallback(() => {
      if (openMenuEntryId !== null) {
         setOpenMenuEntryId(null);
         setOpenMenuBounds(null);
      }
   }, [openMenuEntryId]);

   const closeActiveSwipeable = useCallback(() => {
      if (openSwipeableRef.current) {
         openSwipeableRef.current.ref.close();
         const id = openSwipeableRef.current.id;
         openSwipeableRef.current = null;
         return id;
      }
      return null;
   }, []);

   const onRowSwipeOpen = useCallback((id: string, ref: SwipeableMethods) => {
      if (openSwipeableRef.current && openSwipeableRef.current.ref !== ref) {
         openSwipeableRef.current.ref.close();
      }
      openSwipeableRef.current = { id, ref };
   }, []);

   const onRowSwipeClose = useCallback((id: string) => {
      if (openSwipeableRef.current?.id === id) {
         openSwipeableRef.current = null;
      }
   }, []);

   const toggleMenu = useCallback((entryId: string) => {
      setOpenMenuEntryId((c) => {
         const n = c === entryId ? null : entryId;
         if (n !== c) setOpenMenuBounds(null);
         return n;
      });
   }, []);

   const requestDelete = useCallback(
      (entry: Entry) => {
         closeMenu();
         closeActiveSwipeable();
         store.deleteEntry(entry.id).catch((e) => console.error(e));
      },
      [closeActiveSwipeable, closeMenu, store],
   );

   // --- DATA PREP ---
   const filteredRows = useMemo(
      () =>
         [...store.rows].sort(
            (a, b) =>
               new Date(b.createdAt).getTime() -
               new Date(a.createdAt).getTime(),
         ),
      [store.rows],
   );
   const totalEntries = filteredRows.length;

   // --- RENDER HELPERS ---
   const renderItem = useCallback(
      ({ item, index }: { item: Entry; index: number }) => {
         const prevItem = filteredRows[index - 1];

         const created = new Date(item.createdAt);
         const weekStart = getWeekStart(created);

         const getWeekKeyVal = (d: Date) => d.toISOString().split('T')[0];
         const currentWeekKey = getWeekKeyVal(weekStart);

         let showDateHeader = false;
         if (!prevItem) {
            showDateHeader = true;
         } else {
            const prevCreated = new Date(prevItem.createdAt);
            const prevWeekStart = getWeekStart(prevCreated);
            const prevWeekKey = getWeekKeyVal(prevWeekStart);
            if (currentWeekKey !== prevWeekKey) {
               showDateHeader = true;
            }
         }

         const entryNumber = totalEntries - index;

         return (
            <View>
               {showDateHeader && (
                  <View className="px-6 pt-8 pb-3 items-center">
                     <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {getWeekLabel(weekStart, new Date())}
                     </Text>
                  </View>
               )}

               <Animated.View
                  layout={LinearTransition.duration(180)}
                  exiting={FadeOutUp.duration(180)}
                  className="mb-1"
               >
                  <View className="px-6 -mb-4">
                     <Text className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 opacity-80">
                        ENTRY #{entryNumber}
                     </Text>
                  </View>
                  <EntryRow
                     entry={item}
                     isMenuOpen={openMenuEntryId === item.id}
                     onToggleMenu={() => toggleMenu(item.id)}
                     onCloseMenu={closeMenu}
                     onMenuLayout={setOpenMenuBounds}
                     onSwipeOpen={onRowSwipeOpen}
                     onSwipeClose={onRowSwipeClose}
                     closeActiveSwipeable={closeActiveSwipeable}
                     swipeGestureRef={swipeGestureRef}
                     onEdit={() =>
                        lockNavigation(() =>
                           router.push({
                              pathname: ROUTE_ENTRY_DETAIL,
                              params: { id: item.id, mode: 'edit' },
                           }),
                        )
                     }
                     onDelete={() => requestDelete(item)}
                  />
               </Animated.View>
            </View>
         );
      },
      [
         filteredRows,
         totalEntries,
         openMenuEntryId,
         toggleMenu,
         closeMenu,
         onRowSwipeOpen,
         onRowSwipeClose,
         closeActiveSwipeable,
         lockNavigation,
         requestDelete,
      ],
   );

   // --- HEADER: BIG TITLE (Restored) ---
   const ListHeader = useMemo(
      () => (
         // Added pt-14 to push it down below the floating buttons visually
         <View className="px-6 pt-4 items-center justify-center">
            <Text className="text-2xl font-black text-slate-900 dark:text-white mb-1 text-center">
               Entry History
            </Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">
               {totalEntries} Entries • All Time
            </Text>
         </View>
      ),
      [totalEntries],
   );

   return (
      <View
         className="flex-1 bg-slate-50 dark:bg-slate-900"
         onStartShouldSetResponderCapture={() => {
            if (openMenuEntryId) closeMenu();
            return false;
         }}
      >
         {/* --- 1. FLOATING NAVIGATION (Absolute) --- */}

         {/* Left Button */}
         <View
            className="absolute left-6 z-50"
            style={{ top: insets.top + 10 }}
         >
            <View
               style={[buttonShadow.ios, buttonShadow.android]}
               className="w-11 h-11 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
            >
               <View className="items-center justify-center pl-1">
                  <LeftBackChevron isDark={isDark} />
               </View>
            </View>
         </View>

         {/* Right Button (Trash) */}
         {deletedCount > 0 && (
            <View
               className="absolute right-6 z-50"
               style={{ top: insets.top + 10 }}
            >
               <Pressable
                  style={[buttonShadow.ios, buttonShadow.android]}
                  hitSlop={16}
                  onPress={handleBinPress}
                  className="w-12 h-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 active:opacity-80"
               >
                  <Trash2 size={20} color="#ef4444" strokeWidth={2.5} />
               </Pressable>
            </View>
         )}

         {/* --- 2. MAIN LIST --- */}
         <AnimatedFlatList
            data={filteredRows}
            keyExtractor={(item: any) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            removeClippedSubviews={false}
            contentContainerStyle={{
               // Padding top allows the floating buttons to sit above content initially
               paddingTop: insets.top,
               paddingBottom: insets.bottom,
            }}
            onScrollBeginDrag={() => {
               closeMenu();
               if (!swipeGestureRef.current) {
                  closeActiveSwipeable();
               }
            }}
         />

         <BottomFade height={insets.bottom + 12} />

         {/* --- 3. FAB --- */}
         <NewEntryFab isVisible={isFabVisible} onPress={handleNewEntryPress} />
      </View>
   );
}
