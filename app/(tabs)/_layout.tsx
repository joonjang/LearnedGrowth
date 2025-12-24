import { ThemedTabs } from '@/components/Navigation';
import { Tabs } from 'expo-router';
import { BarChart3, BookOpen, Settings } from 'lucide-react-native';

export default function TabsLayout() {
   return (
      <ThemedTabs>
         <Tabs.Screen 
            name="summary" 
            options={{ 
               href: null,
               title: 'Summary',
               tabBarIcon: ({ color, size }) => (
                  <BarChart3 color={color} size={size} />
               ),
            }} 
         />
         <Tabs.Screen 
            name="entries" 
            options={{ 
               title: 'Entries',
               tabBarIcon: ({ color, size }) => (
                  <BookOpen color={color} size={size} />
               ),
            }} 
         />
         <Tabs.Screen 
            name="settings" 
            options={{ 
               title: 'Settings',
               tabBarIcon: ({ color, size }) => (
                  <Settings color={color} size={size} />
               ),
            }} 
         />
      </ThemedTabs>
   );
}
