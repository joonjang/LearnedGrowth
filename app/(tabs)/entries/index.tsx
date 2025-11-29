import EntryCard from '@/components/entries/EntryCard';
import { getDateParts, getTimeLabel } from '@/lib/date';
import { useEntries } from '@/features/hooks/useEntries';
import { Entry } from '@/models/entry';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
   Pressable,
   SectionList,
   StyleSheet,
   View,
   Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EntrySection = {
   title: string; // e.g. "Today", "Yesterday", "Jan 10"
   dateKey: string; // "YYYY-MM-DD"
   data: Entry[];
};

export default function EntriesScreen() {
   const store = useEntries();
   const insets = useSafeAreaInsets();

   const sections = buildSections(store.rows);

   return (
      <View style={styles.container}>
         <LinearGradient
            colors={['rgba(107, 114, 128, 0.32)', 'rgba(107, 114, 128, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.topGradient, { height: insets.top + 48 }]}
            pointerEvents="none"
         />
         <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentInset={{ top: insets.top }}
            contentOffset={{ y: -insets.top, x: 0 }}
            scrollIndicatorInsets={{ top: insets.top }}
            renderSectionHeader={({ section }) => (
               <View style={styles.sectionHeaderWrapper}>
                  <View style={styles.sectionHeaderPill}>
                     <Text style={styles.sectionHeader}>{section.title}</Text>
                  </View>
               </View>
            )}
            renderItem={({ item, index, section }) => {
               const timeLabel = getTimeLabel(item);

               return (
                  // <Pressable
                  //    onPress={() => router.push(`/(tabs)/entries/${item.id}`)}
                  // >
                     <View style={styles.listContent}>
                        {/* TODO: replace this with fancier UI. */}
                        <Text style={styles.sectionHeaderText}>{timeLabel}</Text>

                        <View>
                           <EntryCard entry={item} />
                        </View>
                     </View>
                  // </Pressable>
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
      </View>
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
   topGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
   },
   sectionHeaderWrapper: {
      paddingVertical: 12,
      alignItems: 'center',
   },
   sectionHeaderPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#D1D5DB',
      backgroundColor: 'rgba(219, 219, 219, 0.66)',
   },
   sectionHeader: {
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '700',
      color: '#374151',
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
