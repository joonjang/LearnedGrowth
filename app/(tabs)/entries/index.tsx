import EntryCard from '@/components/entries/EntryCard';
import { getDateParts, getTimeLabel } from '@/lib/date';
import { useEntries } from '@/features/hooks/useEntries';
import { Entry } from '@/models/entry';
import { Link, router } from 'expo-router';
import {
   FlatList,
   Pressable,
   SectionList,
   StyleSheet,
   View,
   Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type EntrySection = {
   title: string; // e.g. "Today", "Yesterday", "Jan 10"
   dateKey: string; // "YYYY-MM-DD"
   data: Entry[];
};

export default function EntriesScreen() {
   const store = useEntries();

   const sections = buildSections(store.rows);

   return (
      <SafeAreaView style={styles.container}  edges={['top', 'left', 'right']}>
         <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
            renderItem={({ item, index, section }) => {
               const timeLabel = getTimeLabel(item);

               return (
                  <Pressable
                     onPress={() => router.push(`/(tabs)/entries/${item.id}`)}
                  >
                     <View style={styles.listContent}>
                        {/* TODO: replace this with fancier UI. */}
                        <Text style={styles.sectionHeaderText}>{timeLabel}</Text>

                        <View>
                           <EntryCard entry={item} />
                        </View>
                     </View>
                  </Pressable>
               );
            }}
         />

        <View style={styles.newButtonWrapper}>
  <Link href={'/(modals)/entry-new'} asChild>
    <Pressable style={styles.newButton} accessibilityLabel="Create new entry">
      <Text style={styles.newButtonText}>+</Text>
    </Pressable>
  </Link>
</View>
      </SafeAreaView>
   );
}

function buildSections(rows: Entry[]): EntrySection[] {
   const sections: EntrySection[] = [];

   for (const entry of rows) {
      const { dateKey, dateLabel } = getDateParts(entry);

      const lastSection = sections[sections.length - 1];

      if (!lastSection || lastSection.dateKey !== dateKey) {
         sections.push({
            title: dateLabel,
            dateKey,
            data: [entry],
         });
      } else {
         lastSection.data.push(entry);
      }
   }

   return sections;
}



const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: '#F9FAFB',
   },
   listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
   },
   sectionHeader: {
      textAlign:'center'
   },
   sectionHeaderText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6B7280',
      paddingBottom: 8,
      paddingLeft: 8
      
   },
    newButtonWrapper: {
    position: 'absolute',
    right: 24,
    bottom: 18,
  },
  newButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F39C12',
    alignItems: 'center',
    justifyContent: 'center',

  },
  newButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 30,
  },
});
