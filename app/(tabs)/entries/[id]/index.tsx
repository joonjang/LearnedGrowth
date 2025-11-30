import { formatDateTimeWithWeekday } from '@/lib/date';
import { useEntries } from '@/features/hooks/useEntries';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
   SafeAreaView,
   useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type FieldKey = 'adversity' | 'belief' | 'consequence' | 'dispute' | 'energy';

const FIELD_META: {
   key: FieldKey;
   label: string;
   hint: string;
   placeholder: string;
}[] = [
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
   const insets = useSafeAreaInsets();
   const keyboardOffset = insets.bottom + 32;

   const [form, setForm] = useState<Record<FieldKey, string>>({
      adversity: entry?.adversity ?? '',
      belief: entry?.belief ?? '',
      consequence: entry?.consequence ?? '',
      dispute: entry?.dispute ?? '',
      energy: entry?.energy ?? '',
   });
   const [justSaved, setJustSaved] = useState(false);
   const [hasScrolled, setHasScrolled] = useState(false);

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
      setHasScrolled(false);
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

   const handleSave = useCallback(async () => {
      if (!entry || !hasChanges) return;
      const patch: Partial<typeof entry> = {};

      if (trimmed.adversity !== baseline.adversity)
         patch.adversity = trimmed.adversity;
      if (trimmed.belief !== baseline.belief) patch.belief = trimmed.belief;
      if (trimmed.consequence !== baseline.consequence)
         patch.consequence = trimmed.consequence;
      if (trimmed.dispute !== baseline.dispute) patch.dispute = trimmed.dispute;
      if (trimmed.energy !== baseline.energy) patch.energy = trimmed.energy;

      await store.updateEntry(entry.id, patch);
      setJustSaved(true);
   }, [baseline, entry, hasChanges, store, trimmed]);

   const formattedTimestamp = entry
      ? formatDateTimeWithWeekday(entry.createdAt)
      : '';
   const statusMessage = justSaved
      ? 'Saved'
      : hasChanges
        ? 'Unsaved changes'
        : '';
   const statusDisplay = statusMessage || 'Saved';

   useEffect(() => {
      if (!justSaved) return;
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
   }, [justSaved]);

   const handleScroll = useCallback(
      (e: any) => {
         const y = e?.nativeEvent?.contentOffset?.y ?? 0;
         if (y <= 0 && hasScrolled) setHasScrolled(false);
         else if (y > 0 && !hasScrolled) setHasScrolled(true);
      },
      [hasScrolled]
   );

   if (!entry) {
      return (
         <SafeAreaView style={styles.container}>
            <Text style={styles.text}>Entry not found.</Text>
         </SafeAreaView>
      );
   }

   return (
      <View style={styles.container}>
         <View style={{ height: insets.top }} />
         <View style={styles.header}>
            <Pressable
               onPress={() => router.back()}
               style={styles.backButton}
               hitSlop={8}
            >
               <Ionicons name="chevron-back" size={18} color="#111827" />
            </Pressable>

            <View style={styles.titleMeta}>
               <Text style={styles.timeStamp}>
                  {formattedTimestamp || ' '}
               </Text>
               <Text
                  style={[
                     styles.statusText,
                     !statusMessage && styles.statusTextHidden,
                  ]}
               >
                  {statusDisplay}
               </Text>
            </View>

            <View style={styles.actions}>
               <Pressable
                  style={[
                     styles.saveButton,
                     !hasChanges && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!hasChanges}
               >
                  <Text style={[styles.saveLabel, !hasChanges && styles.saveLabelDisabled]}>
                     Save
                  </Text>
               </Pressable>
            </View>
         </View>

         {hasScrolled ? <View style={styles.divider} /> : null}

         <KeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={[
               { paddingBottom: insets.bottom + 16 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bottomOffset={keyboardOffset}
            extraKeyboardSpace={12}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
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
         </KeyboardAwareScrollView>
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      paddingHorizontal: 16,
      backgroundColor: '#F9FAFB',
   },
   header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
   },
   backButton: {
      padding: 8,
   },
   titleMeta: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
   },
   saveButton: {
      padding: 8,
   },
   saveButtonDisabled: {
      opacity: 0.5,
   },
   saveLabel: {
      fontSize: 14,
      color: '#111827',
   },
   saveLabelDisabled: {
      color: '#9CA3AF',
   },
   timeStamp: {
      fontSize: 16,
      color: '#111827',
   },
   actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
   },
   divider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginBottom: 0,
   },
   statusText: {
      fontSize: 13,
      color: '#6B7280',
      position: 'absolute',
      marginTop: 24
   },
   statusTextHidden: {
      opacity: 0,
   },
   scroll: {
      paddingTop: 24,
      flex: 1,
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
