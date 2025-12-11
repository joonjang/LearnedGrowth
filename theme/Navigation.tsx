import { Stack, Tabs } from "expo-router";
import { useTheme } from "./theme";

const stackScreenOptions = {
  headerShown: false,
};

export const ThemedStack = (props: any) => (
  <Stack screenOptions={stackScreenOptions} {...props} />
);

export const ThemedTabs = (props: any) => {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.cardBg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.hint,
      }}
      {...props}
    />
  );
};
