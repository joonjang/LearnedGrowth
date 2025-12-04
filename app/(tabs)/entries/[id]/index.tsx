import { formatDateTimeWithWeekday } from '@/lib/date';
import { useEntries } from '@/features/hooks/useEntries';
import type { Entry } from '@/models/entry';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, Button, Platform, ScrollView } from 'react-native';
import CTA from '@/components/entries/CTA';
import { Ionicons } from '@expo/vector-icons';
import {
   SafeAreaView,
   useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { palette } from '@/theme/colors';
import { useAbcAi } from '@/features/hooks/useAbcAi';

type FieldKey = 'adversity' | 'belief' | 'consequence' | 'dispute' | 'energy';

const FIELD_META = [
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
      accent: {
         backgroundColor: palette.accentBeliefBg,
         borderColor: palette.accentBeliefBorder,
      },
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
      hint: 'Argument against negative belief.',
      placeholder: 'Collect the key sentences you used to dispute',
      accent: {
         backgroundColor: palette.accentDisputeBg,
         borderColor: palette.accentDisputeBorder,
      },
   },
   {
      key: 'energy',
      label: 'Energy',
      hint: 'How you feel after the disputation.',
      placeholder: 'Note any shift in mood or energy',
   },
] satisfies {
   key: FieldKey;
   label: string;
   hint: string;
   placeholder: string;
   accent?: {
      backgroundColor: string;
      borderColor: string;
   };
}[];
const FIELD_KEYS: FieldKey[] = FIELD_META.map((f) => f.key);

function buildFieldRecord(getValue: (key: FieldKey) => string) {
   return FIELD_KEYS.reduce((acc, key) => {
      acc[key] = getValue(key);
      return acc;
   }, {} as Record<FieldKey, string>);
}

export default function EntryDetailScreen() {
   const { id } = useLocalSearchParams();
   const entryId = Array.isArray(id) ? id[0] : id;
   const store = useEntries();
   const entry = entryId ? store.getEntryById(entryId) : undefined;
   const insets = useSafeAreaInsets();
   const keyboardOffset = insets.bottom + 32;

   const [form, setForm] = useState<Record<FieldKey, string>>(() =>
      buildFieldRecord((key) => entry?.[key] ?? '')
   );
   const [justSaved, setJustSaved] = useState(false);
   const [hasScrolled, setHasScrolled] = useState(false);
   const streamScrollRef = useRef<ScrollView | null>(null);

   useEffect(() => {
      if (!entry) return;
      setForm(buildFieldRecord((key) => entry[key] ?? ''));
      setJustSaved(false);
      setHasScrolled(false);
   }, [entry]);

   const trimmed = useMemo(
      () => buildFieldRecord((key) => form[key].trim()),
      [form]
   );

   const baseline = useMemo(
      () => buildFieldRecord((key) => (entry?.[key] ?? '').trim()),
      [entry]
   );

   const hasChanges = useMemo(
      () => FIELD_KEYS.some((key) => trimmed[key] !== baseline[key]),
      [baseline, trimmed]
   );

   const visibleFields = useMemo(
      () =>
         FIELD_META.filter((field) => {
            if (field.key === 'dispute' || field.key === 'energy') {
               return Boolean(baseline[field.key] || trimmed[field.key]);
            }
            return true;
         }),
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
      const patch = FIELD_KEYS.reduce((acc, key) => {
         if (trimmed[key] !== baseline[key]) acc[key] = trimmed[key];
         return acc;
      }, {} as Partial<Entry>);

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

   const { analyze, lastResult, loading, error: aiError, streamText, streaming } = useAbcAi();

   useEffect(() => {
      if (!streamText) return;
      const ref = streamScrollRef.current;
      if (!ref) return;
      ref.scrollToEnd({ animated: true });
   }, [streamText]);

   if (!entry) {
      return (
         <SafeAreaView style={styles.container}>
            <Text style={styles.text}>Entry not found.</Text>
         </SafeAreaView>
      );
   }

   async function onAnalyzePress() {
      if (!entry) return;

      const adversity = form.adversity.trim();
      const belief = form.belief.trim();
      const consequence = form.consequence.trim();

      await analyze({
         adversity,
         belief,
         consequence: consequence || undefined,
      });
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
            {visibleFields.map((field) => (
               <View style={styles.section} key={field.key}>
                  <Text style={styles.label}>{field.label}</Text>
                  <Text style={styles.subLabel}>{field.hint}</Text>
                  <TextInput
                     multiline
                     value={form[field.key]}
                     onChangeText={setField(field.key)}
                     placeholder={field.placeholder}
                     style={[
                        styles.input,
                        field.accent && {
                           backgroundColor: field.accent.backgroundColor,
                           borderColor: field.accent.borderColor,
                        },
                     ]}
                     textAlignVertical="top"
                  />
               </View>
            ))}

           {!entry.dispute?.trim() && (

                  <CTA id={entry.id} />

            )}

           <Button
              title={loading ? (streaming ? "Streaming..." : "Analyzing...") : "Analyze"}
              onPress={onAnalyzePress}
              disabled={loading}
           />

           {(streaming || streamText) && (
              <View style={styles.aiResultContainer}>
                 <Text style={styles.aiResultTitle}>
                    {streaming ? "Streaming response" : "Last streamed response"}
                 </Text>
                 <ScrollView
                    ref={streamScrollRef}
                    style={styles.aiResultScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                 >
                    <Text style={styles.aiResultText}>
                       {streamText || "(waiting for data...)"}
                    </Text>
                 </ScrollView>
              </View>
           )}

           {/* {lastResult && (
              <View style={styles.aiResultContainer}>
                 <Text style={styles.aiResultTitle}>AI analysis (parsed)</Text>
                 <Text style={styles.aiResultText}>
                    {JSON.stringify(lastResult, null, 2)}
                 </Text>
              </View>
           )} */}
           {aiError && (
              <View style={styles.aiResultContainer}>
                 <Text style={styles.aiResultTitle}>AI error</Text>
                 <Text style={styles.aiResultText}>{aiError}</Text>
              </View>
           )}

         </KeyboardAwareScrollView>
      </View>
   );
}

const styles = StyleSheet.create({

    aiResultContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: palette.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  aiResultTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    color: palette.text,
  },
  aiResultText: {
    fontSize: 12,
    lineHeight: 16,
    color: palette.text,
    // optional: make it feel more "code-ish"
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "System",
    }),
   },
   aiResultScroll: {
      maxHeight: 240,
   },

   container: {
      flex: 1,
      paddingHorizontal: 16,
      backgroundColor: palette.cardBg,
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
      color: palette.text,
   },
   saveLabelDisabled: {
      color: palette.hint,
   },
   timeStamp: {
      fontSize: 16,
      color: palette.text,
   },
   actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
   },
   divider: {
      height: 1,
      backgroundColor: palette.border,
      marginBottom: 0,
   },
   statusText: {
      fontSize: 13,
      color: palette.hint,
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
      color: palette.text,
   },
   subLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.hint,
   },
   input: {
      marginTop: 6,
      minHeight: 90,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: palette.text,
      fontSize: 14,
      lineHeight: 20,

      borderRadius: 12,
      backgroundColor: palette.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
   },
   text: {
      fontSize: 14,
      color: palette.text,
   },
});
