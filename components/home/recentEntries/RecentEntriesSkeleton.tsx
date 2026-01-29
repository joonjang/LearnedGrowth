import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

// Define spacing locally to match the parent layout
const SPACING = 12;

type Props = {
   width: number;
   cardWidth: number;
   insetX: number;
   isDark: boolean;
};

export default function RecentEntriesSkeleton({
   width,
   cardWidth,
   insetX,
   isDark,
}: Props) {
   const opacity = useSharedValue(0.4);

   useEffect(() => {
      opacity.value = withRepeat(
         withSequence(
            withTiming(0.8, { duration: 1000 }),
            withTiming(0.4, { duration: 1000 }),
         ),
         -1,
         true,
      );
   }, [opacity]);

   const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

   // Dummy data for skeleton cards
   const skeletonCards = [1, 2];

   return (
      <View style={{ width, alignSelf: 'center', marginTop: 24 }}>
         {/* Header Skeleton */}
         <View
            className="flex-row items-center justify-between mb-4"
            style={{ paddingHorizontal: 32 }}
         >
            <View className="flex-row items-center gap-2">
               <View
                  className={`w-4 h-4 rounded-sm ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
               />
               <View
                  className={`h-3 w-32 rounded-sm ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
               />
            </View>
            <View
               className={`h-3 w-16 rounded-sm ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
            />
         </View>

         {/* Cards Skeleton Row */}
         <View className="relative justify-center">
            {/* Background Track */}
            <View className="absolute left-0 right-0 top-0 bottom-0 bg-slate-100 dark:bg-slate-800/50" />

            <View
               style={{
                  paddingLeft: insetX,
                  flexDirection: 'row',
                  paddingVertical: 20,
                  alignItems: 'center',
                  overflow: 'hidden',
               }}
            >
               {skeletonCards.map((i) => (
                  <Animated.View
                     key={i}
                     style={[
                        animatedStyle,
                        {
                           width: cardWidth,
                           height: 350,
                           marginRight: SPACING,
                           borderRadius: 24,
                        },
                     ]}
                     className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
               ))}
               {/* Peek of 3rd card */}
               <Animated.View
                  style={[
                     animatedStyle,
                     {
                        width: cardWidth,
                        height: 350,
                        marginRight: SPACING,
                        borderRadius: 24,
                        opacity: 0.2,
                     },
                  ]}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
               />
            </View>
         </View>
      </View>
   );
}
