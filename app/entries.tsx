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
import { scheduleIdle } from '@/lib/scheduleIdle';
import { getShadow } from '@/lib/shadow';
import type { Entry } from '@/models/entry';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
   ArrowRight,
   ChevronLeft,
   ChevronRight,
   Search,
   Trash2,
   X,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, {
   useCallback,
   useDeferredValue,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import {
   ActivityIndicator,
   FlatList,
   Keyboard,
   LayoutChangeEvent,
   Pressable,
   Text,
   TextInput,
   useWindowDimensions,
   View,
} from 'react-native';
import { SwipeableMethods } from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';
import Animated, {
   FadeIn,
   FadeInDown,
   FadeOut,
   FadeOutUp,
   interpolate,
   LinearTransition,
   useAnimatedScrollHandler,
   useAnimatedStyle,
   useDerivedValue,
   useSharedValue,
   withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedFlatList = Animated.createAnimatedComponent(
   FlatList,
) as typeof FlatList;
const AnimatedScrollView = Animated.ScrollView;

// --- CONSTANTS ---
const SCROLL_THRESHOLD_FOR_FAB = 100;
const UNANALYZED_CATEGORY_LABEL = 'Not analyzed';
const SEARCH_BUTTON_SIZE = 44; // Matches w-11
const FILTER_CHEVRON_GUTTER = 4;

type FilterMenuType = 'category' | 'theme' | null;

export default function EntriesListScreen() {
   const store = useEntries();
   const { deletedCount, refresh: refreshDeletedEntries } = useDeletedEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { lock: lockNavigation } = useNavigationLock();
   const { width: screenWidth } = useWindowDimensions();
   const params = useLocalSearchParams<{ preview?: string | string[] }>();
   const previewParam = Array.isArray(params.preview)
      ? params.preview[0]
      : params.preview;
   const previewIds = useMemo(
      () =>
         previewParam
            ? previewParam
                 .split(',')
                 .map((id) => id.trim())
                 .filter(Boolean)
            : [],
      [previewParam],
   );

   const [isFullListReady, setIsFullListReady] = useState(
      previewIds.length === 0,
   );

   useEffect(() => {
      setIsFullListReady(previewIds.length === 0);
   }, [previewIds.length]);

   const searchPanelWidth = Math.max(
      SEARCH_BUTTON_SIZE,
      Math.min(screenWidth - 32, 380),
   );

   // Main List Scroll
   const scrollY = useSharedValue(0);
   const scrollHandler = useAnimatedScrollHandler((event) => {
      scrollY.value = event.contentOffset.y;
   });

   const isFabVisible = useDerivedValue(() => {
      return scrollY.value > SCROLL_THRESHOLD_FOR_FAB;
   });

   // Filter Scroll Logic (Chevrons)
   const filterScrollX = useSharedValue(0);
   const [filterContentWidth, setFilterContentWidth] = useState(0);
   const [filterLayoutWidth, setFilterLayoutWidth] = useState(0);
   const filterScrollRef = useRef<Animated.ScrollView>(null);
   const chipLayoutsRef = useRef<Record<string, { x: number; width: number }>>(
      {},
   );

   const filterScrollHandler = useAnimatedScrollHandler((event) => {
      filterScrollX.value = event.contentOffset.x;
   });

   const registerChipLayout = useCallback(
      (menu: FilterMenuType, label: string) => (event: LayoutChangeEvent) => {
         if (!menu) return;
         const { x, width } = event.nativeEvent.layout;
         chipLayoutsRef.current[`${menu}:${label}`] = { x, width };
      },
      [],
   );

   const scrollChipToCenter = useCallback(
      (menu: FilterMenuType, label: string) => {
         if (!menu) return;
         if (filterLayoutWidth <= 0 || filterContentWidth <= 0) return;
         const layout = chipLayoutsRef.current[`${menu}:${label}`];
         if (!layout) return;
         const targetCenter = layout.x + layout.width / 2;
         const maxScroll = Math.max(filterContentWidth - filterLayoutWidth, 0);
         const nextX = Math.min(
            Math.max(targetCenter - filterLayoutWidth / 2, 0),
            maxScroll,
         );
         filterScrollRef.current?.scrollTo({ x: nextX, animated: true });
      },
      [filterContentWidth, filterLayoutWidth],
   );

   const showLeftChevronStyle = useAnimatedStyle(() => {
      return {
         opacity: withTiming(filterScrollX.value > 10 ? 1 : 0),
      };
   });

   const showRightChevronStyle = useAnimatedStyle(() => {
      const maxScroll = filterContentWidth - filterLayoutWidth;
      return {
         opacity: withTiming(
            filterScrollX.value < maxScroll - 10 && maxScroll > 0 ? 1 : 0,
         ),
      };
   });

   // --- STATE ---
   const searchOpenProgress = useSharedValue(0);
   const [isSearchOpen, setIsSearchOpen] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');

   const deferredQuery = useDeferredValue(searchQuery);

   // Filter state
   const [activeMenu, setActiveMenu] = useState<FilterMenuType>(null);
   const [selectedCategory, setSelectedCategory] = useState<string | null>(
      null,
   );
   const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
   const deferredCategory = useDeferredValue(selectedCategory);
   const deferredTheme = useDeferredValue(selectedTheme);

   useEffect(() => {
      if (!activeMenu) return;
      chipLayoutsRef.current = {};
      filterScrollX.value = 0;
      requestAnimationFrame(() => {
         filterScrollRef.current?.scrollTo({ x: 0, animated: false });
      });
   }, [activeMenu, filterScrollX]);

   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const [, setOpenMenuBounds] = useState<MenuBounds | null>(null);

   const openSwipeableRef = useRef<{
      id: string;
      ref: SwipeableMethods;
   } | null>(null);
   const swipeGestureRef = useRef(false);

   // Reverted to 'sm' preset (standard shadow)
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

         if (previewIds.length === 0) {
            setIsFullListReady(true);
            return;
         }

         let cancelled = false;
         const cancelIdle = scheduleIdle(() => {
            if (cancelled) return;
            requestAnimationFrame(() => {
               if (!cancelled) setIsFullListReady(true);
            });
         });

         return () => {
            cancelled = true;
            cancelIdle();
         };
      }, [previewIds.length, refreshDeletedEntries]),
   );

   useEffect(() => {
      refreshDeletedEntries();
   }, [refreshDeletedEntries, store.rows.length]);

   const toggleSearch = useCallback(() => {
      setIsSearchOpen((prev) => {
         if (prev) {
            // Closing
            setActiveMenu(null);
            setSelectedCategory(null);
            setSelectedTheme(null);
            Keyboard.dismiss();
            return false;
         }
         return true;
      });
   }, []);

   const resetSearchFilters = useCallback(() => {
      setSearchQuery('');
      setSelectedCategory(null);
      setSelectedTheme(null);
      setActiveMenu(null);
      Keyboard.dismiss();
   }, []);

   const clearSearchInput = useCallback(() => {
      setSearchQuery('');
   }, []);

   const toggleMenu = useCallback((menu: FilterMenuType) => {
      Keyboard.dismiss();

      // Strict Reset Logic
      setSelectedCategory(null);
      setSelectedTheme(null);

      setActiveMenu((prev) => {
         if (prev === menu) return null;
         return menu;
      });
   }, []);

   const handleCategorySelect = useCallback((cat: string) => {
      Keyboard.dismiss();
      setSelectedCategory((prev) => (prev === cat ? null : cat));
      setSelectedTheme(null);
   }, []);

   const handleThemeSelect = useCallback((theme: string) => {
      Keyboard.dismiss();
      setSelectedTheme((prev) => (prev === theme ? null : theme));
      setSelectedCategory(null);
   }, []);

   useEffect(() => {
      searchOpenProgress.value = withTiming(isSearchOpen ? 1 : 0, {
         duration: 250,
      });
   }, [isSearchOpen, searchOpenProgress]);

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

   const toggleEntryMenu = useCallback((entryId: string) => {
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
   const previewRows = useMemo(() => {
      if (previewIds.length === 0) return [];
      return previewIds
         .map((id) => store.getEntryById(id))
         .filter(Boolean) as Entry[];
   }, [previewIds, store]);

   const sortedRows = useMemo(
      () =>
         !isFullListReady
            ? []
            : [...store.rows].sort(
                 (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
              ),
      [isFullListReady, store.rows],
   );

   const baseRows = useMemo(() => {
      if (isFullListReady) return sortedRows;
      if (previewRows.length > 0) return previewRows;
      return store.rows.slice(0, 5);
   }, [isFullListReady, previewRows, sortedRows, store.rows]);

   const categoryOptions = useMemo(() => {
      const categories = new Set<string>();
      let hasUnanalyzed = false;

      baseRows.forEach((entry) => {
         if (entry.isDeleted) return;
         const category = entry.aiResponse?.meta?.category?.trim();
         if (category) {
            categories.add(category);
         } else {
            hasUnanalyzed = true;
         }
      });

      const list = Array.from(categories).sort((a, b) =>
         a.localeCompare(b, undefined, { sensitivity: 'base' }),
      );

      if (hasUnanalyzed) {
         list.push(UNANALYZED_CATEGORY_LABEL);
      }

      return list;
   }, [baseRows]);

   const themeOptions = useMemo(() => {
      const tags = new Set<string>();
      baseRows.forEach((entry) => {
         if (entry.isDeleted) return;
         entry.aiResponse?.meta?.tags?.forEach((tag) => {
            if (tag?.trim()) tags.add(tag.trim());
         });
      });
      return Array.from(tags).sort((a, b) =>
         a.localeCompare(b, undefined, { sensitivity: 'base' }),
      );
   }, [baseRows]);

   const filteredRows = useMemo(() => {
      const q = deferredQuery.trim().toLowerCase(); // Use deferredQuery here
      const hasQuery = q.length > 0;

      return baseRows.filter((entry) => {
         // 1. Check Category (Fastest check first)
         if (deferredCategory) {
            const category = entry.aiResponse?.meta?.category?.trim() ?? null;
            if (deferredCategory === UNANALYZED_CATEGORY_LABEL) {
               if (category) return false;
            } else if (category !== deferredCategory) {
               return false;
            }
         }

         // 2. Check Theme
         if (deferredTheme) {
            const tags = entry.aiResponse?.meta?.tags ?? [];
            if (!tags.includes(deferredTheme)) return false;
         }

         // 3. Check Text Search (Optimized)
         if (hasQuery) {
            // Check fields one by one. If 'adversity' matches, we stop checking the others.
            // This prevents allocating a large joined string for every row.
            const matches =
               (entry.adversity && entry.adversity.toLowerCase().includes(q)) ||
               (entry.belief && entry.belief.toLowerCase().includes(q)) ||
               (entry.consequence &&
                  entry.consequence.toLowerCase().includes(q)) ||
               (entry.dispute && entry.dispute.toLowerCase().includes(q)) ||
               (entry.energy && entry.energy.toLowerCase().includes(q));

            if (!matches) return false;
         }

         return true;
      });
   }, [baseRows, deferredQuery, deferredCategory, deferredTheme]);

   const totalEntries = filteredRows.length;
   const hasActiveFilters =
      searchQuery !== '' || selectedCategory !== null || selectedTheme !== null;
   const isUpdatingResults =
      deferredQuery !== searchQuery ||
      deferredCategory !== selectedCategory ||
      deferredTheme !== selectedTheme;

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
                     searchQuery={deferredQuery}
                     isMenuOpen={openMenuEntryId === item.id}
                     onToggleMenu={() => toggleEntryMenu(item.id)}
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
         deferredQuery,
         openMenuEntryId,
         closeMenu,
         onRowSwipeOpen,
         onRowSwipeClose,
         closeActiveSwipeable,
         toggleEntryMenu,
         lockNavigation,
         requestDelete,
      ],
   );

   // --- NEW: EMPTY STATE COMPONENT ---
   const renderEmpty = useCallback(() => {
      // Only show this specific empty state if we have filters active but no results
      if (hasActiveFilters && filteredRows.length === 0) {
         return (
            <Animated.View
               entering={FadeIn.duration(300)}
               className="items-center justify-center pt-24 px-8"
            >
               <View className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
                  <Search size={24} color={isDark ? '#64748b' : '#94a3b8'} />
               </View>
               <Text className="text-base font-bold text-slate-700 dark:text-slate-200 text-center mb-1">
                  No matching entries found
               </Text>
               <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  Try adjusting your search terms or filters
               </Text>
            </Animated.View>
         );
      }
      return null;
   }, [hasActiveFilters, filteredRows.length, isDark]);

   const ListHeader = useMemo(
      () => (
         <View className="px-6 pt-4 items-center justify-center">
            <Text className="text-2xl font-black text-slate-900 dark:text-white mb-1 text-center">
               Entry History
            </Text>
            <View className="flex-row items-center gap-2">
               {isFullListReady ? (
                  <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">
                     {totalEntries} Entries •{' '}
                     {hasActiveFilters ? 'Filtered' : 'All Time'}
                  </Text>
               ) : (
                  <View className="h-4 w-36 rounded-full bg-slate-200 dark:bg-slate-700" />
               )}
               {!isSearchOpen && isUpdatingResults && (
                  <ActivityIndicator
                     size="small"
                     color={isDark ? '#94a3b8' : '#64748b'}
                  />
               )}
            </View>
            {deletedCount > 0 && (
               <Animated.View
                  entering={FadeInDown.duration(220)}
                  exiting={FadeOut.duration(160)}
               >
                  <Pressable
                     onPress={handleBinPress}
                     className="mt-3 flex-row items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 px-4 py-2 active:opacity-80"
                  >
                     <Trash2
                        size={14}
                        color={isDark ? '#f87171' : '#ef4444'}
                        strokeWidth={2.5}
                     />
                     <Text
                        numberOfLines={1}
                        className="text-xs font-semibold text-slate-700 dark:text-slate-200"
                     >
                        View deleted {deletedCount === 1 ? 'entry' : 'entries'}
                     </Text>
                     <ArrowRight
                        size={12}
                        color={isDark ? '#94a3b8' : '#64748b'}
                        strokeWidth={2.5}
                     />
                  </Pressable>
               </Animated.View>
            )}
         </View>
      ),
      [
         deletedCount,
         handleBinPress,
         hasActiveFilters,
         isDark,
         isFullListReady,
         isSearchOpen,
         isUpdatingResults,
         totalEntries,
      ],
   );

   // --- SEARCH ANIMATION STYLES ---
   const searchContainerStyle = useAnimatedStyle(() => {
      const width = interpolate(
         searchOpenProgress.value,
         [0, 1],
         [SEARCH_BUTTON_SIZE, searchPanelWidth],
      );

      const borderRadius = interpolate(
         searchOpenProgress.value,
         [0, 1],
         [SEARCH_BUTTON_SIZE / 2, 24],
      );

      return {
         width,
         borderRadius,
      };
   }, [searchPanelWidth]);

   const searchIconStyle = useAnimatedStyle(() => {
      const scale = interpolate(searchOpenProgress.value, [0, 1], [1, 0.9]);
      const rotate = interpolate(searchOpenProgress.value, [0, 1], [0, 90]);
      return {
         transform: [{ scale }, { rotate: `${rotate}deg` }],
      };
   });

   // Chip Styles
   const chipBase =
      'px-3 py-1.5 rounded-full border mr-2 flex-row items-center justify-center';
   const chipInactive =
      'bg-slate-100 border-slate-200 dark:bg-slate-700/50 dark:border-slate-600';
   const chipActive =
      'bg-slate-900 border-slate-900 dark:bg-indigo-500 dark:border-indigo-500';
   const chipTextInactive =
      'text-slate-600 dark:text-slate-300 text-xs font-semibold';
   const chipTextActive = 'text-white text-xs font-bold';

   const FilterChip = ({
      label,
      isActive,
      onPress,
      onLayout,
   }: {
      label: string;
      isActive: boolean;
      onPress: () => void;
      onLayout?: (event: LayoutChangeEvent) => void;
   }) => (
      <Pressable
         onPress={onPress}
         onLayout={onLayout}
         className={`${chipBase} ${isActive ? chipActive : chipInactive}`}
      >
         <Text className={isActive ? chipTextActive : chipTextInactive}>
            {label}
         </Text>
      </Pressable>
   );

   return (
      <View
         className="flex-1 bg-slate-50 dark:bg-slate-900"
         onStartShouldSetResponderCapture={() => {
            if (openMenuEntryId) closeMenu();
            return false;
         }}
      >
         {/* --- 1. FLOATING NAVIGATION --- */}

         {/* Left Button */}
         <View
            className="absolute left-6 z-50"
            style={{ top: insets.top + 10 }}
         >
            <View
               style={[buttonShadow.ios, buttonShadow.android]}
               className="w-12 h-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
            >
               <View className="items-center justify-center pl-2">
                  <LeftBackChevron isDark={isDark} />
               </View>
            </View>
         </View>

         {/* Right Button (Search & Filter) */}
         <View
            className="absolute right-6 z-50 items-end"
            style={{ top: insets.top + 10 }}
         >
            <Animated.View
               style={[
                  buttonShadow.ios,
                  buttonShadow.android,
                  searchContainerStyle,
               ]}
               className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 items-end"
            >
               <View className="w-full">
                  {/* Top Row: Input + Filter Toggles + Search/Close */}
                  <View
                     className="flex-row items-center w-full"
                     style={{ height: SEARCH_BUTTON_SIZE }}
                  >
                     {isSearchOpen ? (
                        <Animated.View
                           entering={FadeIn.duration(200)}
                           className="flex-1 flex-row items-center pl-3"
                        >
                           {/* Text Input Container */}
                           <View className="flex-1 flex-row items-center relative mr-2">
                              <TextInput
                                 value={searchQuery}
                                 onChangeText={setSearchQuery}
                                 placeholder="Search..."
                                 placeholderTextColor={
                                    isDark ? '#64748b' : '#94a3b8'
                                 }
                                 className="flex-1 h-full text-base font-medium text-slate-900 dark:text-slate-100 pr-12"
                                 autoFocus={false}
                                 returnKeyType="search"
                                 onSubmitEditing={Keyboard.dismiss}
                              />
                              <View className="absolute right-0 flex-row items-center gap-2">
                                 {isUpdatingResults && (
                                    <ActivityIndicator
                                       size="small"
                                       color={isDark ? '#94a3b8' : '#64748b'}
                                    />
                                 )}
                                 {searchQuery.length > 0 && (
                                    <Pressable
                                       onPress={clearSearchInput}
                                       hitSlop={10}
                                       className="p-1"
                                    >
                                       <View className="bg-slate-200 dark:bg-slate-600 rounded-full p-0.5">
                                          <X
                                             size={12}
                                             color={
                                                isDark ? '#e2e8f0' : '#475569'
                                             }
                                             strokeWidth={3}
                                          />
                                       </View>
                                    </Pressable>
                                 )}
                              </View>
                           </View>

                           {/* Divider */}
                           <View className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-2" />

                           {/* Text Buttons Container */}
                           <View className="flex-row items-center gap-1 mr-1">
                              {/* Category Button */}
                              <Pressable
                                 onPress={() => toggleMenu('category')}
                                 className={`px-2 py-1.5 rounded-md ${
                                    activeMenu === 'category' ||
                                    selectedCategory !== null
                                       ? 'bg-slate-100 dark:bg-slate-700'
                                       : 'bg-transparent'
                                 }`}
                              >
                                 <Text
                                    className={`text-[10px] font-bold uppercase tracking-wide ${
                                       activeMenu === 'category' ||
                                       selectedCategory !== null
                                          ? 'text-indigo-600 dark:text-indigo-400'
                                          : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                 >
                                    Category
                                 </Text>
                              </Pressable>

                              {/* Theme Button */}
                              <Pressable
                                 onPress={() => toggleMenu('theme')}
                                 className={`px-2 py-1.5 rounded-md ${
                                    activeMenu === 'theme' ||
                                    selectedTheme !== null
                                       ? 'bg-slate-100 dark:bg-slate-700'
                                       : 'bg-transparent'
                                 }`}
                              >
                                 <Text
                                    className={`text-[10px] font-bold uppercase tracking-wide ${
                                       activeMenu === 'theme' ||
                                       selectedTheme !== null
                                          ? 'text-indigo-600 dark:text-indigo-400'
                                          : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                 >
                                    Theme
                                 </Text>
                              </Pressable>
                           </View>
                        </Animated.View>
                     ) : (
                        <View className="flex-1" />
                     )}

                     {/* Search/Close Toggle - ALIGNED CENTER */}
                     <Pressable
                        hitSlop={12}
                        onPress={() => {
                           if (isSearchOpen) {
                              resetSearchFilters();
                           }
                           toggleSearch();
                        }}
                        style={{
                           height: SEARCH_BUTTON_SIZE,
                           width: SEARCH_BUTTON_SIZE,
                        }}
                        className="items-center justify-center active:opacity-60"
                     >
                        <Animated.View style={searchIconStyle}>
                           {isSearchOpen ? (
                              <X
                                 size={24}
                                 color={isDark ? '#e2e8f0' : '#0f172a'}
                                 strokeWidth={2.5}
                              />
                           ) : (
                              <Search
                                 size={24}
                                 color={isDark ? '#e2e8f0' : '#0f172a'}
                                 strokeWidth={2.5}
                              />
                           )}
                        </Animated.View>
                     </Pressable>
                  </View>

                  {/* Bottom Row: Options Area */}
                  {isSearchOpen && activeMenu !== null && (
                     <Animated.View
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(150)}
                        className="w-full pb-3 pl-4 pr-4"
                     >
                        <View className="h-[1px] bg-slate-100 dark:bg-slate-700 mb-2.5 w-full" />

                        {/* Title for Context */}
                        <Text className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">
                           {activeMenu === 'category'
                              ? 'Select Category'
                              : 'Select Theme'}
                        </Text>

                        {/* Scrolling Container */}
                        <View className="relative">
                           <Animated.View
                              style={[
                                 showLeftChevronStyle,
                                 {
                                    position: 'absolute',
                                    left: -6,
                                    top: 0,
                                    bottom: 0,
                                    zIndex: 10,
                                    justifyContent: 'center',
                                    width: FILTER_CHEVRON_GUTTER,
                                 },
                              ]}
                              pointerEvents="none"
                           >
                              <View className="items-center justify-center">
                                 <ChevronLeft
                                    size={16}
                                    color={isDark ? '#94a3b8' : '#64748b'}
                                 />
                              </View>
                           </Animated.View>

                           <Animated.View
                              style={[
                                 showRightChevronStyle,
                                 {
                                    position: 'absolute',
                                    right: -6,
                                    top: 0,
                                    bottom: 0,
                                    zIndex: 10,
                                    justifyContent: 'center',
                                    width: FILTER_CHEVRON_GUTTER,
                                 },
                              ]}
                              pointerEvents="none"
                           >
                              <View className="items-center justify-center">
                                 <ChevronRight
                                    size={16}
                                    color={isDark ? '#94a3b8' : '#64748b'}
                                 />
                              </View>
                           </Animated.View>

                           <AnimatedScrollView
                              key={`filters-${activeMenu ?? 'none'}`}
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              keyboardShouldPersistTaps="always"
                              onScroll={filterScrollHandler}
                              scrollEventThrottle={16}
                              ref={filterScrollRef}
                              onContentSizeChange={(w) =>
                                 setFilterContentWidth(w)
                              }
                              onLayout={(e) =>
                                 setFilterLayoutWidth(
                                    e.nativeEvent.layout.width,
                                 )
                              }
                              style={{
                                 marginHorizontal: FILTER_CHEVRON_GUTTER,
                              }}
                              className="flex-row"
                           >
                              {activeMenu === 'category' && (
                                 <>
                                    {categoryOptions.length === 0 && (
                                       <Text className="text-xs text-slate-400 italic">
                                          No categories found
                                       </Text>
                                    )}
                                    {categoryOptions.map((cat) => (
                                       <FilterChip
                                          key={cat}
                                          label={cat}
                                          isActive={selectedCategory === cat}
                                          onPress={() => {
                                             handleCategorySelect(cat);
                                             scrollChipToCenter(
                                                'category',
                                                cat,
                                             );
                                          }}
                                          onLayout={registerChipLayout(
                                             'category',
                                             cat,
                                          )}
                                       />
                                    ))}
                                 </>
                              )}

                              {activeMenu === 'theme' && (
                                 <>
                                    {themeOptions.length === 0 && (
                                       <Text className="text-xs text-slate-400 italic">
                                          No themes found
                                       </Text>
                                    )}
                                    {themeOptions.map((theme) => (
                                       <FilterChip
                                          key={theme}
                                          label={theme}
                                          isActive={selectedTheme === theme}
                                          onPress={() => {
                                             handleThemeSelect(theme);
                                             scrollChipToCenter('theme', theme);
                                          }}
                                          onLayout={registerChipLayout(
                                             'theme',
                                             theme,
                                          )}
                                       />
                                    ))}
                                 </>
                              )}
                              <View className="w-4" />
                           </AnimatedScrollView>
                        </View>
                     </Animated.View>
                  )}
               </View>
            </Animated.View>
         </View>

         {/* --- 2. MAIN LIST --- */}
         <AnimatedFlatList
            data={filteredRows}
            keyExtractor={(item: any) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={renderEmpty}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            // Performance Props
            removeClippedSubviews={false} // Keep false if you have complex swipe interactions
            initialNumToRender={10} // Only render what fits on screen initially
            maxToRenderPerBatch={10} // Batches updates
            windowSize={5} // Reduces memory usage (default is 21)
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
               paddingTop: insets.top,
               paddingBottom: insets.bottom + 80,
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
