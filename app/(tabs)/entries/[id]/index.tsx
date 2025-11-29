import { formatDate, getTimeLabel } from '@/lib/date';
import { useEntries } from '@/features/hooks/useEntries';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
   StyleSheet,
   View,
   Text,
   Pressable,
   ScrollView,
   TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FieldKey = 'adversity' | 'belief' | 'consequence' | 'dispute' | 'energy';

const FIELD_META: Array<{
   key: FieldKey;
   label: string;
   hint: string;
   placeholder: string;
}> = [
   {
      key: 'adversity',
      label: 'Adversity',
      hint: 'What happened?',
      placeholder: 'Describe the situation briefly',
   },
   {
      key: 'belief',
      label: 'Belief',
      hint: 'What were you telling yourself?',
      placeholder: 'Capture the core thought',
   },
   {
      key: 'consequence',
      label: 'Consequence',
      hint: 'How did you feel and act?',
      placeholder: 'Feelings, reactions, and behaviors',
   },
   {
      key: 'dispute',
      label: 'Dispute',
      hint: 'Evidence. Alternatives. Usefulness.',
      placeholder: 'Collect the key sentences you used to dispute',
   },
   {
      key: 'energy',
      label: 'Energy',
      hint: 'How you feel after the disputation.',
      placeholder: 'Note any shift in mood or energy',
   },
];

export default function EntryDetailScreen() {
   const { id } = useLocalSearchParams();
   const entryId = Array.isArray(id) ? id[0] : id;
   const store = useEntries();
   const entry = entryId ? store.getEntryById(entryId) : undefined;

   const [form, setForm] = useState<Record<FieldKey, string>>({
      adversity: entry?.adversity ?? '',
      belief: entry?.belief ?? '',
      consequence: entry?.consequence ?? '',
      dispute: entry?.dispute ?? '',
      energy: entry?.energy ?? '',
   });
   const [saving, setSaving] = useState(false);
   const [justSaved, setJustSaved] = useState(false);

   useEffect(() => {
      if (!entry) return;
      setForm({
         adversity: entry.adversity ?? '',
         belief: entry.belief ?? '',
         consequence: entry.consequence ?? '',
         dispute: entry.dispute ?? '',
         energy: entry.energy ?? '',
      });
      setJustSaved(false);
   }, [entry]);

   const trimmed = useMemo(
      () => ({
         adversity: form.adversity.trim(),
         belief: form.belief.trim(),
         consequence: form.consequence.trim(),
         dispute: form.dispute.trim(),
         energy: form.energy.trim(),
      }),
      [form]
   );

   const baseline = useMemo(
      () => ({
         adversity: (entry?.adversity ?? '').trim(),
         belief: (entry?.belief ?? '').trim(),
         consequence: (entry?.consequence ?? '').trim(),
         dispute: (entry?.dispute ?? '').trim(),
         energy: (entry?.energy ?? '').trim(),
      }),
      [entry]
   );

   const hasChanges = useMemo(
      () =>
         trimmed.adversity !== baseline.adversity ||
         trimmed.belief !== baseline.belief ||
         trimmed.consequence !== baseline.consequence ||
         trimmed.dispute !== baseline.dispute ||
         trimmed.energy !== baseline.energy,
      [baseline, trimmed]
   );

   const setField = useCallback(
      (key: FieldKey) => (value: string) => {
         setForm((prev) => ({ ...prev, [key]: value }));
         setJustSaved(false);
      },
      []
   );

   const formattedDate = entry ? formatDate(entry.createdAt) : '';
   const formattedTime = entry ? getTimeLabel(entry) : '';

   if (!entry) {
      return (
         <SafeAreaView style={styles.container}>
            <Text style={styles.text}>Entry not found.</Text>
         </SafeAreaView>
      );
   }

   const handleSave = useCallback(async () => {
      if (!hasChanges || saving) return;
      setSaving(true);
      const patch: Partial<typeof entry> = {};

      if (trimmed.adversity !== baseline.adversity)
         patch.adversity = trimmed.adversity;
      if (trimmed.belief !== baseline.belief) patch.belief = trimmed.belief;
      if (trimmed.consequence !== baseline.consequence)
         patch.consequence = trimmed.consequence;
      if (trimmed.dispute !== baseline.dispute) patch.dispute = trimmed.dispute;
      if (trimmed.energy !== baseline.energy) patch.energy = trimmed.energy;

      await store.updateEntry(entry.id, patch);
      setSaving(false);
      setJustSaved(true);
   }, [baseline, entry.id, hasChanges, saving, store, trimmed]);

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.header}>
            <Pressable
               onPress={() => router.back()}
               style={styles.backButton}
               hitSlop={8}
            >
               <Text style={styles.backText}>Back</Text>
            </Pressable>

            <View style={styles.titleMeta}>
               <Text style={styles.title}>Entry</Text>
            </View>

            <Pressable
               style={[
                  styles.saveButton,
                  (!hasChanges || saving) && styles.saveButtonDisabled,
               ]}
               onPress={handleSave}
               disabled={!hasChanges || saving}
            >
               <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save'}
               </Text>
            </Pressable>
         </View>

         <Text style={styles.timeStamp}>
            {formattedTime && formattedDate
               ? `${formattedTime} · ${formattedDate}`
               : formattedDate || ' '}
         </Text>

         <View style={styles.divider} />

         <View style={styles.statusRow}>
            <Text style={styles.statusText}>
               {justSaved ? 'Saved' : hasChanges ? 'Unsaved changes' : ' '}
            </Text>
         </View>

         <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
         >
            {FIELD_META.map((field) => (
               <View style={styles.section} key={field.key}>
                  <Text style={styles.label}>{field.label}</Text>
                  <Text style={styles.subLabel}>{field.hint}</Text>
                  <TextInput
                     multiline
                     value={form[field.key]}
                     onChangeText={setField(field.key)}
                     placeholder={field.placeholder}
                     style={styles.input}
                     textAlignVertical="top"
                  />
               </View>
            ))}
         </ScrollView>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#F9FAFB',
   },
   header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
   },
   backButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#D1D5DB',
      backgroundColor: '#FFFFFF',
   },
   backText: {
      fontSize: 14,
      color: '#111827',
   },
   titleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
   title: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
   },
   saveButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: '#111827',
   },
   saveButtonDisabled: {
      backgroundColor: '#9CA3AF',
   },
   saveButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
   },
   timeStamp: {
      fontSize: 13,
      color: '#6B7280',
      marginBottom: 8,
   },
   divider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginBottom: 10,
   },
   statusRow: {
      marginBottom: 6,
   },
   statusText: {
      fontSize: 13,
      color: '#6B7280',
   },
   scroll: {
      flex: 1,
   },
   scrollContent: {
      paddingBottom: 28,
   },
   section: {
      marginBottom: 16,
      gap: 4,
   },
   label: {
      fontSize: 15,
      fontWeight: '700',
      color: '#111827',
   },
   subLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#6B7280',
   },
   input: {
      marginTop: 6,
      minHeight: 90,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      color: '#111827',
      fontSize: 14,
      lineHeight: 20,
   },
   text: {
      fontSize: 14,
      color: '#111827',
   },
});
