import QuickStart from '@/components/appInfo/QuickStart';
import EntriesWeekFilterHeader from '@/components/home/EntriesWeekFilterHeader';
import HomeDashboard from '@/components/home/HomeDashboard';
import TopFade from '@/components/utils/TopFade';
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
import { PRIMARY_CTA_CLASS, PRIMARY_CTA_TEXT_CLASS } from '@/lib/styles';
import type { Entry } from '@/models/entry';
import { useAuth } from '@/providers/AuthProvider';
import { router, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import Animated, {
   FadeInDown,
   useAnimatedScrollHandler,
   useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EntriesScreen() {
   const store = useEntries();
   const { deletedCount, refresh: refreshDeletedEntries } = useDeletedEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { status } = useAuth();
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
   const handleSelectFilter = useCallback((key: EntryCountFilterKey) => {
      setSelectedFilterKey(key);
      setIsDropdownOpen(false);
      setHasUserSelectedFilter(true);
   }, []);

   const hasEntries = totalCount > 0;
   const showQuickStart =
      store.lastHydratedAt !== null &&
      !store.isHydrating &&
      !hasEntries &&
      status !== 'signedIn';

   if (showQuickStart) {
      return (
         <View className="flex-1 bg-slate-50 dark:bg-slate-900">
            <QuickStart />
         </View>
      );
   }

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <Animated.ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
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
               {isReady && (
                  <Animated.View
                     entering={FadeInDown.duration(600).springify()}
                     className="mt-6 z-10"
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
