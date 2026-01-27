import { Stack, Tabs, usePathname } from 'expo-router';
import { useMemo } from 'react';
import { Platform, View } from 'react-native'; // Added View
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Added Insets

// 1. Swap the import to your new hook
import { useThemeColor } from '@/hooks/useThemeColor';

const stackScreenOptions = {
   headerShown: false,
   contentStyle: { backgroundColor: 'transparent' },
};

export const ThemedStack = (props: any) => (
   <Stack screenOptions={stackScreenOptions} {...props} />
);

export const ThemedTabs = (props: any) => {
   const { colors } = useThemeColor();
   const pathname = usePathname();
   const insets = useSafeAreaInsets(); // Get safe area insets

   const shouldHideTabs = useMemo(() => {
      if (!pathname) return false;
      // Matches:
      // 1. /entries/new
      // 2. /dispute/123 (The new root route)
      return /\/entries\/new|\/dispute\/.*/.test(pathname);
   }, [pathname]);
   return (
      <Tabs
         // Conditionally override the Tab Bar component
         tabBar={
            shouldHideTabs && Platform.OS === 'android'
               ? () => (
                    <View
                       style={{
                          // Standard Tab Bar height is usually ~49-60.
                          // We add the bottom inset to handle the safe area.
                          height: 60 + insets.bottom,
                          backgroundColor: colors.background, // Match screen background
                          borderTopWidth: 0,
                          elevation: 0,
                       }}
                    />
                 )
               : undefined // Passing undefined lets the default TabBar render
         }
         screenOptions={{
            headerShown: false,
            tabBarStyle: {
               backgroundColor: colors.card,
               borderTopColor: colors.border,
               elevation: 0,
               // Remove the conditional style logic here since we handle it in the tabBar prop above
            },
            tabBarActiveTintColor: colors.active,
            tabBarInactiveTintColor: colors.inactive,
         }}
         initialRouteName="entries"
         {...props}
      />
   );
};
