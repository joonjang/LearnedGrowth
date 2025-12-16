import { ThemedTabs } from '@/components/Navigation';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
   return (
      <ThemedTabs>
         <Tabs.Screen 
            name="summary" 
            options={{ 
               title: 'Summary',
               tabBarIcon: ({ color, size }) => (
                  <Ionicons name="stats-chart" size={size} color={color} />
               ),
            }} 
         />
         <Tabs.Screen 
            name="entries" 
            options={{ 
               title: 'Entries',
               tabBarIcon: ({ color, size }) => (
                  <Ionicons name="reader" size={size} color={color} />
               ),
            }} 
         />
         <Tabs.Screen 
            name="settings" 
            options={{ 
               title: 'Settings',
               tabBarIcon: ({ color, size }) => (
                  <Ionicons name="settings" size={size} color={color} />
               ),
            }} 
         />
      </ThemedTabs>
   );
}