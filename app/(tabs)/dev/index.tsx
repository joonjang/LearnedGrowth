import React, { useState } from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEntries } from '@/features/hooks/useEntries';

// Minimal DB playground for useEntries
export default function DevScreen() {
   const [count, setCount] = useState(1);
   const {
      rows,
      isHydrating,
      pending,
      errors,
      hydrate,
      refresh,
      createEntry,
      updateEntry,
      deleteEntry,
      clearErrors,
   } = useEntries();

   async function handleCreate() {
      const suffix = String(count);
      await createEntry(`adv-${suffix}`, `belief-${suffix}`);
      setCount(count + 1);
   }

   return (
      <SafeAreaView style={{ flex: 1, padding: 12 }}>
         <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Button title={isHydrating ? 'Hydrating…' : 'Hydrate'} onPress={hydrate} />
            <Button title="Refresh" onPress={refresh} />
            <Button title="New" onPress={handleCreate} />
            <Button title="Clear Errors" onPress={clearErrors} />
         </View>

         {'global' in errors && errors['global'] ? (
            <Text style={{ color: 'red', marginBottom: 8 }}>
               Global error: {String(errors['global'])}
            </Text>
         ) : null}

         <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
            renderItem={({ item }) => (
               <View style={{ borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 }}>
                  <Text style={{ fontWeight: '600' }}>{item.adversity}</Text>
                  <Text>{item.belief}</Text>
                  <Text style={{ color: '#555' }}>{item.updatedAt || 'timestamp?'}</Text>
                  {pending[item.id] ? (
                     <Text style={{ color: '#d97706' }}>pending: {pending[item.id].op}</Text>
                  ) : null}
                  {errors[item.id] ? (
                     <Text style={{ color: 'red' }}>error: {String(errors[item.id])}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                     <Button
                        title="Update"
                        onPress={() =>
                           updateEntry(item.id, { belief: `${item.belief} (updated)` })
                        }
                     />
                     <Button color="red" title="Delete" onPress={() => deleteEntry(item.id)} />
                  </View>
                  <Text>
                     {JSON.stringify(item, null, 4)}
                  </Text>
               </View>
            )}
            ListEmptyComponent={<Text>No entries yet.</Text>}
         />
      </SafeAreaView>
   );
}
