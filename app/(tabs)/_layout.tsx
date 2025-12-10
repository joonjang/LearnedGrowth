import { ThemedTabs } from '@/theme/Navigation';
import { Tabs } from 'expo-router';
//https://docs.expo.dev/router/advanced/tabs/
export default function TabsLayout() {
   return (
      <ThemedTabs>
         <Tabs.Screen name="feeds" options={{ title: 'World' }} />
         <Tabs.Screen name="entries" options={{ title: 'Entries' }} />
         <Tabs.Screen name="account" options={{ title: 'Account' }} />
         <Tabs.Screen name="dev" options={{ title: '0-DEV' }} />
      </ThemedTabs>
   );
}
