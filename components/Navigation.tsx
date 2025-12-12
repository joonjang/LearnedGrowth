import { Stack, Tabs, usePathname } from "expo-router";
import { useMemo } from "react";
import { Platform } from "react-native";
// 1. Swap the import to your new hook
import { useThemeColor } from "@/hooks/useThemeColor";

const stackScreenOptions = {
  headerShown: false,
  // Optional: Set a default background color for the transition area
  contentStyle: { backgroundColor: 'transparent' }, 
};

export const ThemedStack = (props: any) => (
  <Stack screenOptions={stackScreenOptions} {...props} />
);

export const ThemedTabs = (props: any) => {
  // 2. Use the hook to get the raw hex strings
  const { colors } = useThemeColor();
  const pathname = usePathname();

  const shouldHideTabs = useMemo(() => {
    if (!pathname) return false;
    // Regex matches: /entries/new OR /entries/[id]/dispute
    return /\/entries\/(new|.*\/dispute)$/.test(pathname);
  }, [pathname]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
            {
              backgroundColor: colors.background, // Uses: #f8fafc or #0f172a
              borderTopColor: colors.border,      // Uses: #e2e8f0 or #1e293b
            },
            shouldHideTabs && Platform.OS === 'android' 
               ? { display: 'none' } 
               : {}
        ],
        // 3. Map the active/inactive state colors
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.inactive,
      }}
      {...props}
    />
  );
};