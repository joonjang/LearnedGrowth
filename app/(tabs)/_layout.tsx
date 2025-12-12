import { ThemedTabs } from '@/components/Navigation';
import { Tabs } from 'expo-router';
//https://docs.expo.dev/router/advanced/tabs/
export default function TabsLayout() {
   return (
      <ThemedTabs>
         <Tabs.Screen name="summary" options={{ title: 'Summary' }} />
         <Tabs.Screen name="entries" options={{ title: 'Entries' }} />
         <Tabs.Screen name="account" options={{ title: 'Account' }} />
      </ThemedTabs>
   );
}
