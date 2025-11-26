import { useEntries } from '@/features/hooks/useEntries';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EntryDetailScreen() {
   const { id } = useLocalSearchParams();
   const entryId = Array.isArray(id) ? id[0] : id;
   const store = useEntries();
   const entry = store.getEntryById(entryId);

   return (
      <SafeAreaView style={styles.card}>
         <View style={styles.section}>
            <Text style={styles.label}>Adversity</Text>
            <Text style={styles.subLabel}>What happened?</Text>
            <Text style={styles.text}>{entry.adversity}</Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Belief</Text>
            <Text style={styles.subLabel}>What were you telling yourself?</Text>
            <View style={styles.beliefBox}>
               <Text style={styles.beliefText}>{entry.belief}</Text>
            </View>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Consequence</Text>
            <Text style={styles.subLabel}>How did you feel and act?</Text>
            <Text>{entry.consequence}</Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Dispute</Text>
            <Text style={styles.subLabel}>
               Evidence. Alternatives. Implicatins. Usefulness.
            </Text>
            <Text>{entry.dispute}</Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Energy</Text>
            <Text style={styles.subLabel}>
               How you feel after the disputation.
            </Text>
            <Text>{entry.energy}</Text>
         </View>

         <Pressable
            onPress={() => {
               router.back();
            }}
            style={{
               borderWidth: 1,
               borderColor: 'red',
            }}
         >
            <Text>Back</Text>
         </Pressable>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   card: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
   },
   section: {
      marginBottom: 8,
   },
   label: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6B7280', // gray-500-ish
      marginBottom: 2,
   },
   subLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#424242',
      marginBottom: 2,
   },
   text: {
      fontSize: 14,
      color: '#111827',
   },
   beliefBox: {
      marginHorizontal: -16,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: '#FFE4E6',
      borderWidth: 1,
      borderColor: '#FDA4AF',
   },
   beliefText: {
      fontSize: 14,
      fontWeight: '500',
      // fontStyle: 'italic',

      color: '#9F1239',
   },
});
