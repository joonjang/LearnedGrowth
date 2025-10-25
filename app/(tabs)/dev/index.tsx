// app/(tabs)/dev/index.tsx
import React, { useState } from 'react';
import { View, Text, Button, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useEntries } from '@/features/entries/hooks/useEntries';

export default function DevScreen() {

   const [count, setCount] = useState(0);
   const { rows, isHydrating, pending, errors, hydrate, refresh, createEntry, updateEntry, deleteEntry, clearErrors } = useEntries();

   return (
      <SafeAreaView style={{ flex: 1, padding: 12 }}>
         <View style={{ flexDirection: 'row' }}>
            <Button
               title={isHydrating ? 'Hydrating...' : 'Hydrate'}
               onPress={hydrate}
            />
            <Button title="Refresh" onPress={refresh} />
            <Button title="Insert" onPress={()=>{
               createEntry('adversity - ' + count, 'belief - ' + count);
               setCount(count + 1);
            }} />
            <Button
               title="Clear Errors"
               onPress={clearErrors}
            />
         </View>

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
            Open modal
         </Link>

         {'global' in errors && errors['global'] ? (
            <Text>Global error: {String(errors['global'])}</Text>
         ) : null}

         <FlatList
            data={rows}
            keyExtractor={(e) => e.id}
            renderItem={({ item: e }) => (
               <View style={{ paddingVertical: 8, borderBottomWidth: 1 }}>
                  <Text>{e.adversity}</Text>
                  <Text>{e.belief}</Text>
                  <Text>{e.updatedAt}</Text>
                  {pending[e.id] ? (
                     <Text>pending: {pending[e.id].op}</Text>
                  ) : null}
                  {errors[e.id] ? (
                     <Text>error: {String(errors[e.id])}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row' }}>
                     <Pressable
                        onPress={() => updateEntry(e.id, {belief: 'UPDATE ' + count})}
                        style={{
                           borderWidth: 1,
                           borderColor: 'blue',
                           paddingHorizontal: 8,
                           paddingVertical: 4,
                           borderRadius: 6,
                           marginRight: 8,
                        }}
                     >
                        <Text>Update</Text>
                     </Pressable>
                     <Pressable
                        onPress={() => deleteEntry(e.id)}
                        style={{
                           borderWidth: 1,
                           borderColor: 'red',
                           paddingHorizontal: 8,
                           paddingVertical: 4,
                           borderRadius: 6,
                           marginRight: 8,
                        }}
                     >
                        <Text> Delete</Text>
                     </Pressable>
                  </View>
               </View>
            )}
            ListEmptyComponent={<Text>No entries yet.</Text>}
         />
      </SafeAreaView>
   );
}
