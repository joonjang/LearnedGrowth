import { useEntries } from '@/features/entries/hooks/useEntries';
import { Entry } from '@/models/entry';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Pressable, Text, TextInput, View } from 'react-native';

export default function EntryDetailScreen() {
   const { id } = useLocalSearchParams();
   const entryId = Array.isArray(id) ? id[0] : id;
   const store = useEntries();
   const entry = store.getEntryById(entryId);

   const [adversity, setAdversity] = useState(entry?.adversity ?? '');
   const [belief, setBelief] = useState(entry?.belief ?? '');
   const [consequence, setConsequence] = useState(entry?.consequence ?? '');
   const [dispute, setDispute] = useState(entry?.dispute ?? '');
   const [energy, setEnergy] = useState(entry?.energy ?? '');

   const dirty =
      adversity !== entry.adversity ||
      belief !== entry.belief ||
      consequence !== (entry.consequence ?? '') ||
      dispute !== (entry.dispute ?? '') ||
      energy !== (entry.energy ?? '');

   const patch: Partial<Entry> = {};
   if (adversity !== entry.adversity) patch.adversity = adversity;
   if (belief !== entry.belief) patch.belief = belief;
   if (consequence !== (entry.consequence ?? ''))
      patch.consequence = consequence;
   if (dispute !== (entry.dispute ?? '')) patch.dispute = dispute;
   if (energy !== (entry.energy ?? '')) patch.energy = energy;

   return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
         <Text>Adversity: {entry.adversity}</Text>
         <TextInput
            onChangeText={(text) => setAdversity(text)}
            value={adversity}
         />
         <View
            style={{
               height: 1,
               backgroundColor: 'orange',
               alignSelf: 'stretch',
            }}
         />
         <Text>Belief: {entry.belief}</Text>
         <TextInput onChangeText={(text) => setBelief(text)} value={belief} />
         <View
            style={{
               height: 1,
               backgroundColor: 'orange',
               alignSelf: 'stretch',
            }}
         />
         <Text>Consequence: {entry.consequence}</Text>
         <TextInput
            onChangeText={(text) => setConsequence(text)}
            value={consequence}
         />
         <View
            style={{
               height: 1,
               backgroundColor: 'orange',
               alignSelf: 'stretch',
            }}
         />
         <Text>Dispute: {entry.dispute}</Text>
         <TextInput
            onChangeText={(text) => setDispute(text)}
            value={dispute}
            placeholder="Empty"
         />
         <View
            style={{
               height: 1,
               backgroundColor: 'orange',
               alignSelf: 'stretch',
            }}
         />
         <Text>Energy: {entry.energy}</Text>
         <TextInput onChangeText={(text) => setEnergy(text)} value={energy} />
         <View
            style={{
               height: 1,
               backgroundColor: 'blue',
               alignSelf: 'stretch',
            }}
         />
         <Text>Created: {entry.createdAt}</Text>
         <Text>Updated: {entry.updatedAt}</Text>
         <Button onPress={() => router.back()} title="Back" />
         <Pressable
            disabled={!dirty}
            onPress={() => store.updateEntry(entryId, patch)}
            style={{
               borderWidth: 2,
               borderColor: dirty ? 'blue' : 'pink',
               paddingHorizontal: 8,
               paddingVertical: 4,
               borderRadius: 6,
               marginRight: 8,
            }}
         >
            <Text>Update</Text>
         </Pressable>
         <Pressable
            onPress={() => {store.deleteEntry(entryId);  router.back(); }}
            style={{
               borderWidth: 1,
               borderColor: 'red',
               paddingHorizontal: 8,
               paddingVertical: 4,
               borderRadius: 6,
               marginRight: 8,
            }}
         >
            <Text>Delete</Text>
         </Pressable>
      </View>
   );
}
