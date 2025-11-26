import EntryCard from '@/components/entries/EntryCard';
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
            <Link href={'/(modals)/entry-new'} style={styles.newButton}>
               New
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

function getDateParts(entry: Entry): { dateKey: string; dateLabel: string } {
   const raw = entry.createdAt;
   const d = new Date(raw);

   if (Number.isNaN(d.getTime())) {
      return { dateKey: 'invalid', dateLabel: '' };
   }

   // dateKey: "YYYY-MM-DD"
   const y = d.getFullYear();
   const m = d.getMonth() + 1;
   const day = d.getDate();
   const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
   )}`;

   const now = new Date();
   const todayKey = toKey(now);

   const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
   );
   const yesterdayKey = toKey(yesterday);

   let dateLabel: string;
   if (dateKey === todayKey) {
      dateLabel = 'Today';
   } else if (dateKey === yesterdayKey) {
      dateLabel = 'Yesterday';
   } else {
      dateLabel = d.toLocaleDateString('en-US', {
         month: 'short',
         day: 'numeric',
      }); // e.g. "Jan 10"
   }

   return { dateKey, dateLabel };
}

function toKey(d: Date): string {
   const y = d.getFullYear();
   const m = d.getMonth() + 1;
   const day = d.getDate();
   return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTimeLabel(entry: Entry): string {
   const raw = entry.createdAt;
   if (!raw) return '';

   const d = new Date(raw);
   if (Number.isNaN(d.getTime())) return '';

   return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
   });
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
      right: 16,
      bottom: 24,
   },
   newButton: {
      borderWidth: 1,
      borderColor: '#16A34A',
      backgroundColor: '#4ADE80',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      fontWeight: '600',
   },
});
