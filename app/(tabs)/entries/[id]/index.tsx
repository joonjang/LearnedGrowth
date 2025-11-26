import { formatDate } from '@/lib/date';
import { useEntries } from '@/features/hooks/useEntries';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EntryDetailScreen() {
   const { id } = useLocalSearchParams();
   const entryId = Array.isArray(id) ? id[0] : id;
   const store = useEntries();
   const entry = store.getEntryById(entryId);

   const formattedDate = formatDate(entry.createdAt);

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.titleRow}>
            <Pressable
               onPress={() => {
                  router.back();
               }}
               style={{
                  borderWidth: 1,
                  borderColor: '#111827',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  marginRight: 8,
               }}
            >
               <Text>Back</Text>
            </Pressable>
            <View style={styles.titleMeta}>
                {/* TODO: change time to the time stamp of when this was made, same format as the entries timestamp format */}
               <Text style={styles.title}>[TIME]</Text>
               <Text style={styles.dot}> · </Text>
               <Text style={styles.date}>{formattedDate}</Text>
            </View>
         </View>
         <View style={styles.divider} />

         <View style={styles.section}>
            <Text style={styles.label}>Adversity</Text>
            <Text style={styles.subLabel}>What happened?</Text>
            <Text style={styles.text}>{entry.adversity}</Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Belief</Text>
            <Text style={styles.subLabel}>What were you telling yourself?</Text>
            <Text style={styles.text}>{entry.belief}</Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Consequence</Text>
            <Text style={styles.subLabel}>How did you feel and act?</Text>
            <Text style={styles.text}>{entry.consequence}</Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Dispute</Text>
            <Text style={styles.subLabel}>
               Evidence. Alternatives. Usefulness.
            </Text>
            <Text style={styles.text}>{entry.dispute}</Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Energy</Text>
            <Text style={styles.subLabel}>
               How you feel after the disputation.
            </Text>
            <Text style={styles.text}>{entry.energy}</Text>
         </View>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
   },
   titleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
   title: {
      fontSize: 14,
      fontWeight: '700',
   },
   dot: {
      fontSize: 14,
   },
   date: {
      fontSize: 14,
      color: '#6B7280',
   },
   //    divider: {
   //       height: StyleSheet.hairlineWidth,
   //       backgroundColor: '#616161',
   //       marginBottom: 12,
   //    },
   divider: {
      height: 1,
      backgroundColor: '#9E9E9E',
      marginVertical: 8,
   },
   container: {
      flex: 1,
      padding: 16,
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
      paddingLeft: 4,
      fontSize: 14,
      color: '#111827',
   },
});
