import QuickStart from '@/components/appInfo/QuickStart';
import {
   PRIMARY_CTA_CLASS,
   PRIMARY_CTA_TEXT_CLASS,
} from '@/components/constants';
import EntriesWeekFilterHeader from '@/components/entries/EntriesWeekFilterHeader';
import HomeDashboard from '@/components/home/HomeDashboard';
import TopFade from '@/components/TopFade';
import { useDeletedEntries } from '@/hooks/useDeletedEntries';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { getWeekStart } from '@/lib/date';
import {
   buildEntryCountFilterOptions,
   type EntryCountFilterKey,
   getDefaultEntryCountFilterKey,
   getEntryCountForFilter,
   sortEntriesByCreatedAtDesc,
} from '@/lib/entries';
import { getShadow } from '@/lib/shadow';
import type { Entry } from '@/models/entry';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import Animated, {
   FadeIn,
   FadeInDown,
   useAnimatedScrollHandler,
   useAnimatedStyle,
   useSharedValue,
   withRepeat,
   withSequence,
   withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- HELPERS (Keep these here for the dashboard stats) ---
const TitleSkeleton = () => {
   const opacity = useSharedValue(0.3);
   useEffect(() => {
      opacity.value = withRepeat(
         withSequence(
            withTiming(0.7, { duration: 800 }),
            withTiming(0.3, { duration: 800 }),
         ),
         -1,
         true,
      );
   }, [opacity]);
   const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
   return (
      <Animated.View
         style={style}
         className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 ml-2"
      />
   );
};

export default function EntriesScreen() {
   const store = useEntries();
   const { deletedCount, refresh: refreshDeletedEntries } = useDeletedEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { lock: lockNavigation } = useNavigationLock();
   const [showHelpModal, setShowHelpModal] = useState(false);
   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
   const totalCount = store.rows.length;
   const [selectedFilterKey, setSelectedFilterKey] =
      useState<EntryCountFilterKey>('last-5');
   const [hasUserSelectedFilter, setHasUserSelectedFilter] = useState(false);

   const shadowSm = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark],
   );
   const ctaShadow = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'button',
            androidElevation: 3,
            colorLight: '#000000',
         }),
      [isDark],
   );

   const scrollY = useSharedValue(0);
   const scrollHandler = useAnimatedScrollHandler((event) => {
      scrollY.value = event.contentOffset.y;
   });

   const handleNewEntryPress = useCallback(() => {
      lockNavigation(() => router.push('/new'));
   }, [lockNavigation]);

   // Navigate to the new List Screen
   const handleViewEntries = useCallback(() => {
      lockNavigation(() => router.push('/entries'));
   }, [lockNavigation]);

   const handleDeleteEntry = useCallback(
      (entry: Entry) => {
         store.deleteEntry(entry.id).catch(() => {});
      },
      [store],
   );

   useFocusEffect(
      useCallback(() => {
         refreshDeletedEntries();
      }, [refreshDeletedEntries]),
   );
   useEffect(() => {
      refreshDeletedEntries();
   }, [refreshDeletedEntries, store.rows.length]);

   // --- LOADING STATES ---
   const isHydrated = store.lastHydratedAt !== null && !store.isHydrating;
   const [isReady, setIsReady] = useState(false);

   useEffect(() => {
      if (isHydrated) {
         const timer = setTimeout(() => setIsReady(true), 500);
         return () => clearTimeout(timer);
      }
   }, [isHydrated]);

   // --- Filtering (For Dashboard Stats Only) ---
   const filterOptions = useMemo(
      () => buildEntryCountFilterOptions(totalCount),
      [totalCount],
   );
   const isFilterLoading = !isHydrated && totalCount === 0;

   useEffect(() => {
      if (!isHydrated) return;
      const isValid = filterOptions.some(
         (option) => option.key === selectedFilterKey,
      );
      if (!isValid) {
         setSelectedFilterKey(getDefaultEntryCountFilterKey(totalCount));
         return;
      }
      if (!hasUserSelectedFilter) {
         const defaultKey = getDefaultEntryCountFilterKey(totalCount);
         if (selectedFilterKey !== defaultKey) {
            setSelectedFilterKey(defaultKey);
         }
      }
   }, [
      filterOptions,
      hasUserSelectedFilter,
      isHydrated,
      selectedFilterKey,
      totalCount,
   ]);

   const sortedRows = useMemo(
      () => sortEntriesByCreatedAtDesc(store.rows),
      [store.rows],
   );

   const filteredRows = useMemo(() => {
      const count = getEntryCountForFilter(selectedFilterKey);
      if (!count) return sortedRows;
      return sortedRows.slice(0, count);
   }, [selectedFilterKey, sortedRows]);

   const selectedFilterOption = useMemo(
      () =>
         filterOptions.find((option) => option.key === selectedFilterKey) ??
         null,
      [filterOptions, selectedFilterKey],
   );

   const displayLabel = selectedFilterOption?.label ?? 'All Entries';

   const anchorDate = useMemo(() => {
      const latestEntry = filteredRows[0];
      if (latestEntry) {
         const created = new Date(latestEntry.createdAt);
         if (!Number.isNaN(created.getTime())) return created;
      }
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now;
   }, [filteredRows]);

   const showEncouragement = useMemo(() => {
      if (selectedFilterKey === 'all') return false;
      const currentWeekStart = getWeekStart(new Date());
      const anchorWeekStart = getWeekStart(anchorDate);
      return currentWeekStart.getTime() === anchorWeekStart.getTime();
   }, [anchorDate, selectedFilterKey]);

   const reframedCount = useMemo(() => {
      return filteredRows.filter((e) => (e.dispute ?? '').trim().length > 0)
         .length;
   }, [filteredRows]);

   const thoughtLabel = reframedCount === 1 ? 'Thought' : 'Thoughts';
   const handleSelectFilter = useCallback((key: EntryCountFilterKey) => {
      setSelectedFilterKey(key);
      setIsDropdownOpen(false);
      setHasUserSelectedFilter(true);
   }, []);

   const hasEntries = totalCount > 0;
   const showQuickStart =
      store.lastHydratedAt !== null && !store.isHydrating && !hasEntries;

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <Animated.ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
         >
            <View
               style={{ paddingTop: insets.top + 12 }}
               className="px-6 pb-6 bg-slate-50 dark:bg-slate-900 z-50"
            >
               <EntriesWeekFilterHeader
                  isDark={isDark}
                  isDropdownOpen={isDropdownOpen}
                  isLoading={isFilterLoading}
                  displayLabel={displayLabel}
                  selectedFilterKey={selectedFilterKey}
                  filterOptions={filterOptions}
                  onToggleDropdown={() =>
                     setIsDropdownOpen((prevOpen) => !prevOpen)
                  }
                  onCloseDropdown={() => setIsDropdownOpen(false)}
                  onSelectFilter={handleSelectFilter}
                  onShowHelp={() => setShowHelpModal(true)}
                  deletedCount={deletedCount}
               />

               {/* MAIN STATS TEXT */}
               {isReady ? (
                  <Animated.View entering={FadeIn.duration(500)}>
                     <Text className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 z-10 ml-2">
                        {reframedCount} {thoughtLabel}{' '}
                        <Text className="text-indigo-600 font-extrabold">
                           Reframed
                        </Text>
                     </Text>
                  </Animated.View>
               ) : (
                  <TitleSkeleton />
               )}

               {/* LINK TO LIST VIEW (Decoupled) */}
               <Pressable
                  onPress={handleViewEntries}
                  hitSlop={8}
                  className="flex-row items-center gap-2 mb-4 ml-2 self-start active:opacity-70"
               >
                  <Text className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                     View All Entries
                  </Text>
                  <ChevronRight
                     size={14}
                     color={isDark ? '#818cf8' : '#4f46e5'}
                     strokeWidth={2.5}
                  />
               </Pressable>

               {/* DASHBOARD (No List) */}
               <View className="z-10 mb-6">
                  <HomeDashboard
                     entries={filteredRows}
                     anchorDate={anchorDate}
                     shadowSm={shadowSm}
                     isDark={isDark}
                     showEncouragement={showEncouragement}
                     onDeleteEntry={handleDeleteEntry}
                     isLoading={!isReady}
                     isAllTime={selectedFilterKey === 'all'}
                  />
               </View>

               {/* PRIMARY ACTION */}
               {isReady && !showQuickStart && (
                  <Animated.View
                     entering={FadeInDown.duration(600).springify()}
                     className="mt-1 z-10"
                  >
                     <Pressable
                        onPress={handleNewEntryPress}
                        className={`relative flex-row items-center justify-center rounded-2xl px-6 py-4 ${PRIMARY_CTA_CLASS}`}
                        style={[ctaShadow.ios, ctaShadow.android]}
                     >
                        <Text
                           className={`text-lg font-bold text-center ${PRIMARY_CTA_TEXT_CLASS}`}
                        >
                           What&apos;s on your mind?
                        </Text>
                     </Pressable>
                  </Animated.View>
               )}

               {showQuickStart && <QuickStart />}
            </View>
         </Animated.ScrollView>

         {/* MODALS */}
         <Modal
            visible={showHelpModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowHelpModal(false)}
         >
            {Platform.OS === 'android' && <TopFade height={insets.top + 12} />}
            <View className="flex-1 pt-2 bg-slate-50 dark:bg-slate-900">
               <QuickStart
                  isModal={true}
                  onClose={() => setShowHelpModal(false)}
               />
            </View>
         </Modal>
      </View>
   );
}
