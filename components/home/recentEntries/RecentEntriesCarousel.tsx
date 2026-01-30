import EntryCard from '@/components/entries/entry/EntryCard';
import { getShadow } from '@/lib/shadow';
import { HOME_ICON_DARK, HOME_ICON_LIGHT } from '@/lib/styles';
import { Entry } from '@/models/entry';
import {
   ArrowRight,
   ChevronLeft,
   ChevronRight,
   FileText,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
   FlatList,
   Pressable,
   Text,
   TouchableOpacity,
   useWindowDimensions,
   View,
   ViewToken,
} from 'react-native';
import Animated, {
   FadeIn,
   FadeOutLeft,
   LinearTransition,
   useAnimatedStyle,
   useSharedValue,
   withTiming,
} from 'react-native-reanimated';
import RecentEntriesSkeleton from './RecentEntriesSkeleton';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CARD_WIDTH_PERCENTAGE = 0.85;
const SPACING = 12;

// --- TYPES ---
type CarouselItem =
   | { type: 'entry'; data: Entry; id: string }
   | { type: 'view-more'; id: 'view-more-card' };

// --- CHEVRON COMPONENT ---
const CarouselChevron = ({
   direction,
   onPress,
   isDark,
   shadowStyle,
}: {
   direction: 'left' | 'right';
   onPress: () => void;
   isDark: boolean;
   shadowStyle: any;
}) => {
   const scale = useSharedValue(1);
   const Icon = direction === 'left' ? ChevronLeft : ChevronRight;

   const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
   }));

   const handlePressIn = () => {
      scale.value = withTiming(0.9, { duration: 100 });
   };

   const handlePressOut = () => {
      scale.value = withTiming(1, { duration: 100 });
   };

   return (
      <AnimatedPressable
         onPress={onPress}
         onPressIn={handlePressIn}
         onPressOut={handlePressOut}
         hitSlop={24}
         style={[shadowStyle, animatedStyle]}
         className={`w-12 h-12 rounded-full items-center justify-center border ${
            isDark
               ? 'bg-slate-800 border-slate-700'
               : 'bg-white border-slate-100'
         }`}
      >
         <Icon size={24} color={isDark ? '#e2e8f0' : '#475569'} />
      </AnimatedPressable>
   );
};

// --- MAIN COMPONENT ---
type Props = {
   entries: Entry[];
   onDelete: (entry: Entry) => void;
   isDark: boolean;
   onViewAll?: () => void;
   isLoading?: boolean;
};

export default function RecentEntriesCarousel({
   entries,
   onDelete,
   isDark,
   onViewAll,
   isLoading = false,
}: Props) {
   // --- HOOKS ---
   const { width } = useWindowDimensions();
   const flatListRef = useRef<FlatList>(null);
   const [activeIndex, setActiveIndex] = useState(0);
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);

   const cardWidth = width * CARD_WIDTH_PERCENTAGE;
   const ITEM_FULL_WIDTH = cardWidth + SPACING;
   const insetX = (width - ITEM_FULL_WIDTH) / 2;

   // --- DATA PREPARATION ---
   const data = useMemo<CarouselItem[]>(() => {
      const sliced = entries.slice(0, 5).map((e) => ({
         type: 'entry' as const,
         data: e,
         id: e.id,
      }));

      // UPDATED LOGIC: If we have 5 OR MORE entries, append the "View More" card.
      if (entries.length >= 5) {
         return [
            ...sliced,
            { type: 'view-more' as const, id: 'view-more-card' },
         ];
      }

      return sliced;
   }, [entries]);

   // --- SHADOWS ---
   const chevronShadow = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'button',
            disableInDark: false,
            androidElevation: 6,
            colorLight: '#0f172a',
         }),
      [isDark],
   );

   const buttonShadow = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'button',
            androidElevation: 2,
            colorLight: '#000000',
         }),
      [isDark],
   );

   // --- HANDLERS ---
   const handleToggleMenu = useCallback((entryId: string) => {
      setOpenMenuEntryId((current) => (current === entryId ? null : entryId));
   }, []);

   const handleCloseMenu = useCallback(() => {
      setOpenMenuEntryId(null);
   }, []);

   const handleDeleteWrapper = useCallback(
      (entry: Entry) => {
         handleCloseMenu();
         onDelete(entry);
      },
      [handleCloseMenu, onDelete],
   );

   const scrollToIndex = (index: number) => {
      const targetIndex = Math.max(0, Math.min(index, data.length - 1));

      flatListRef.current?.scrollToOffset({
         offset: targetIndex * ITEM_FULL_WIDTH,
         animated: true,
      });
   };

   const handleScrollLeft = () => scrollToIndex(activeIndex - 1);
   const handleScrollRight = () => scrollToIndex(activeIndex + 1);

   const onViewableItemsChanged = useRef(
      ({ viewableItems }: { viewableItems: ViewToken[] }) => {
         if (viewableItems.length > 0) {
            const centerItem = viewableItems[0];
            if (centerItem?.index !== null && centerItem?.index !== undefined) {
               setActiveIndex(centerItem.index);
            }
         }
      },
   ).current;

   const getItemLayout = useCallback(
      (_: any, index: number) => ({
         length: ITEM_FULL_WIDTH,
         offset: ITEM_FULL_WIDTH * index,
         index,
      }),
      [ITEM_FULL_WIDTH],
   );

   // --- RENDER ITEM ---
   const renderItem = useCallback(
      ({ item }: { item: CarouselItem }) => {
         // 1. RENDER "VIEW MORE" CARD
         if (item.type === 'view-more') {
            return (
               <View
                  style={{
                     width: cardWidth,
                     marginHorizontal: SPACING / 2,
                     height: 350,
                  }}
               >
                  <TouchableOpacity
                     onPress={onViewAll}
                     activeOpacity={0.7}
                     className="flex-1 items-center justify-center bg-white dark:bg-slate-800 rounded-[24px] border-2 border-dashed border-slate-300 dark:border-slate-600"
                  >
                     <View className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-800/50 items-center justify-center mb-4">
                        <ArrowRight
                           size={24}
                           color={isDark ? '#818cf8' : '#4f46e5'}
                        />
                     </View>
                     <Text className="text-base font-bold text-slate-700 dark:text-slate-200">
                        View All Entries
                     </Text>
                     <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        See your full history
                     </Text>
                  </TouchableOpacity>
               </View>
            );
         }

         // 2. RENDER ENTRY CARD
         return (
            <Animated.View
               style={{
                  width: cardWidth,
                  marginHorizontal: SPACING / 2,
               }}
               entering={FadeIn}
               exiting={FadeOutLeft.duration(200)}
               layout={LinearTransition.duration(300)}
            >
               <EntryCard
                  entry={item.data}
                  isMenuOpen={openMenuEntryId === item.data.id}
                  onToggleMenu={() => handleToggleMenu(item.data.id)}
                  onCloseMenu={handleCloseMenu}
                  onDelete={handleDeleteWrapper}
                  onNavigate={() => handleCloseMenu()}
               />
            </Animated.View>
         );
      },
      [
         cardWidth,
         openMenuEntryId,
         handleToggleMenu,
         handleCloseMenu,
         handleDeleteWrapper,
         isDark,
         onViewAll,
      ],
   );

   // --- LOADING CHECK ---
   if (isLoading) {
      return (
         <RecentEntriesSkeleton
            width={width}
            cardWidth={cardWidth}
            insetX={insetX}
            isDark={isDark}
         />
      );
   }

   // --- EMPTY CHECK ---
   if (entries.length === 0) return null;

   const showLeftChevron = activeIndex > 0;
   const showRightChevron = activeIndex < data.length - 1;

   return (
      <View className="mt-6" style={{ width: width, alignSelf: 'center' }}>
         {/* HEADER */}
         <View
            className="flex-row items-center justify-between mb-4"
            style={{ paddingHorizontal: 32 }}
         >
            <View className="flex-row items-center gap-2">
               <FileText
                  size={16}
                  color={isDark ? HOME_ICON_DARK : HOME_ICON_LIGHT}
               />
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Recent Entries
               </Text>
            </View>

            {/* View All Button */}
            <TouchableOpacity
               onPress={onViewAll}
               hitSlop={8}
               activeOpacity={0.8}
               className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-300/50 dark:border-slate-700 flex-row items-center gap-1"
            >
               {/* Changed text color from indigo to slate */}
               <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  View All
               </Text>
               {/* Changed icon color to match slate text colors */}
               <ArrowRight size={12} color={isDark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
         </View>

         {/* CAROUSEL CONTAINER */}
         <View className="relative justify-center">
            {/* BACKGROUND TRACK */}
            <View className="absolute left-0 right-0 top-0 bottom-0 bg-slate-200/50 dark:bg-slate-700/50" />

            <FlatList
               ref={flatListRef}
               data={data}
               renderItem={renderItem}
               keyExtractor={(item) => item.id}
               horizontal
               showsHorizontalScrollIndicator={false}
               contentContainerStyle={{
                  paddingHorizontal: insetX,
                  paddingVertical: 20,
                  alignItems: 'center',
               }}
               snapToAlignment="start"
               decelerationRate="fast"
               snapToInterval={ITEM_FULL_WIDTH}
               getItemLayout={getItemLayout}
               onViewableItemsChanged={onViewableItemsChanged}
               viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
               scrollEventThrottle={16}
            />

            {/* Left Chevron */}
            <View
               className="absolute top-0 bottom-0 justify-center left-4 z-10"
               pointerEvents="box-none"
            >
               {showLeftChevron && (
                  <Animated.View entering={FadeIn.duration(200)}>
                     <CarouselChevron
                        direction="left"
                        onPress={handleScrollLeft}
                        isDark={isDark}
                        shadowStyle={chevronShadow.style}
                     />
                  </Animated.View>
               )}
            </View>

            {/* Right Chevron */}
            <View
               className="absolute top-0 bottom-0 justify-center right-4 z-10"
               pointerEvents="box-none"
            >
               {showRightChevron && (
                  <Animated.View entering={FadeIn.duration(200)}>
                     <CarouselChevron
                        direction="right"
                        onPress={handleScrollRight}
                        isDark={isDark}
                        shadowStyle={chevronShadow.style}
                     />
                  </Animated.View>
               )}
            </View>
         </View>
      </View>
   );
}
