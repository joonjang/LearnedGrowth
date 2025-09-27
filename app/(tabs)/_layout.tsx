import { ThemedTabs } from "@/providers/Navigation";
import { Tabs } from "expo-router";
//https://docs.expo.dev/router/advanced/tabs/
export default function TabsLayout() {
  return (
    <ThemedTabs>
      <Tabs.Screen name="feeds"    options={{ title: "World"}} />
      <Tabs.Screen name="entries"  options={{ title: "Entries" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings"}} />
    </ThemedTabs>
  );
}
