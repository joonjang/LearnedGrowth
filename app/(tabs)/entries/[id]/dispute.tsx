// app/(tabs)/entries/[id]/dispute.tsx
import React from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEntries } from '@/features/hooks/useEntries';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DisputeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useEntries();

  const entry = store.rows.find((e) => e.id === id);
  const [disputeText, setDisputeText] = React.useState(entry?.dispute ?? '');

  React.useEffect(() => {
    if (entry) setDisputeText(entry.dispute ?? '');
  }, [entry?.id, entry?.dispute]);

  if (!entry) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Entry not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontWeight: '600', marginBottom: 8 }}>Original belief</Text>
      <Text style={{ marginBottom: 16 }}>
        “{entry.belief}”
      </Text>

      <Text style={{ fontWeight: '600', marginBottom: 8 }}>Dispute</Text>
      <TextInput
        placeholder="Write a kinder, more accurate belief..."
        style={{
          borderWidth: 1,
          borderColor: '#CCC',
          borderRadius: 8,
          padding: 8,
          minHeight: 100,
          textAlignVertical: 'top',
          marginBottom: 16,
        }}
        multiline
        value={disputeText}
        onChangeText={setDisputeText}
      />

      <Button
        title="Save & go back"
        onPress={async () => {
          if (disputeText !== entry.dispute) {
            await store.updateEntry(entry.id, { dispute: disputeText });
          }
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
