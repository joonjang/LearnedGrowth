import { useEntries } from '@/features/hooks/useEntries';
import { Link, router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EntriesScreen() {
   const store = useEntries();

   return (
      <SafeAreaView
         style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
         <FlatList
            data={store.rows}
            keyExtractor={(e) => e.id}
            renderItem={({ item: e }) => (
               <Pressable
                  onPress={() => router.push(`/(tabs)/entries/${e.id}`)}
               >
                  <View style={{ borderBottomWidth: 1, padding: 5 }}>
                     <Text>Created: {e.createdAt}</Text>
                     <Text>Adversity: {e.adversity}</Text>
                     {/* <Text>Belief: {e.belief}</Text> */}
                  </View>
               </Pressable>
            )}
         />

         <Link
            href={'/(modals)/entry-new'}
            style={{
               borderWidth: 2,
               backgroundColor: 'lightgreen',
               paddingHorizontal: 8,
               paddingVertical: 4,
               borderRadius: 6,
               marginRight: 8,
            }}
         >
            New
         </Link>
      </SafeAreaView>
   );
}
