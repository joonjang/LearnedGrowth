import { Stack, Tabs, usePathname } from "expo-router";
import { useMemo } from "react";
import { Platform } from "react-native";
import { useTheme } from "./theme";

const stackScreenOptions = {
  headerShown: false,
};

export const ThemedStack = (props: any) => (
  <Stack screenOptions={stackScreenOptions} {...props} />
);

export const ThemedTabs = (props: any) => {
  const { colors } = useTheme();

  const pathname = usePathname();

  const shouldHideTabs = useMemo(() => {
    if (!pathname) return false;
    // Use the regex for cleaner matching (New or Dispute)
    return /\/entries\/(new|.*\/dispute)$/.test(pathname);
  }, [pathname]);

  const baseTabBarStyle = {
    backgroundColor: colors.cardBg,
    borderTopColor: colors.border,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
            baseTabBarStyle,
            shouldHideTabs && Platform.OS === 'android' 
               ? { display: 'none' } 
               : {}
        ],
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.hint,
      }}
      {...props}
    />
  );
};
