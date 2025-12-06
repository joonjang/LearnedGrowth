import { formatDateTimeWithWeekday } from '@/lib/date';
import { useEntries } from '@/features/hooks/useEntries';
import type { Entry } from '@/models/entry';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
   StyleSheet,
   View,
   Text,
   Pressable,
   TextInput,
   Platform,
   LayoutAnimation,
   UIManager,
} from 'react-native';
import CTAButton from '@/components/entries/CTAButton';
import { Ionicons } from '@expo/vector-icons';
import {
   SafeAreaView,
   useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
   KeyboardAwareScrollView,
   KeyboardController,
} from 'react-native-keyboard-controller';
import { palette } from '@/theme/colors';
import AnalyzeButton from '@/components/entries/dispute/AnalyzeButton';
import { shadowSoft } from '@/theme/shadows';

type FieldKey = 'adversity' | 'belief' | 'consequence' | 'dispute' | 'energy';
type DimensionKey = 'permanence' | 'pervasiveness' | 'personalization';

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
   useEffect(() => {
      if (
         Platform.OS === 'android' &&
         UIManager.setLayoutAnimationEnabledExperimental
      ) {
         UIManager.setLayoutAnimationEnabledExperimental(true);
      }
   }, []);

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
   const [isEditing, setIsEditing] = useState(false);
   const [editSnapshot, setEditSnapshot] =
      useState<Record<FieldKey, string> | null>(null);
   const [showAnalysis, setShowAnalysis] = useState(false);

   useEffect(() => {
      if (!entry) return;
      setForm(buildFieldRecord((key) => entry[key] ?? ''));
      setJustSaved(false);
      setHasScrolled(false);
      setIsEditing(false);
      setEditSnapshot(null);
      setShowAnalysis(false);
   }, [entry]);

   const trimmed = useMemo(
      () => buildFieldRecord((key) => form[key].trim()),
      [form]
   );

   const baseline = useMemo(
      () => buildFieldRecord((key) => (entry?.[key] ?? '').trim()),
      [entry]
   );

   const analysis = entry?.analysis ?? null;
   const aiDisplayData = useMemo(() => {
      if (!analysis) return null;
      return {
         analysis,
         safety: { isCrisis: false, crisisMessage: null },
         suggestions: {
            evidenceQuestion: null,
            alternativesQuestion: null,
            usefulnessQuestion: null,
            counterBelief: entry?.counterBelief ?? null,
         },
      };
   }, [analysis, entry?.counterBelief]);

   const hasChanges = useMemo(
      () => FIELD_KEYS.some((key) => trimmed[key] !== baseline[key]),
      [baseline, trimmed]
   );

   const visibleFields = useMemo(() => {
      const showDispute = Boolean(baseline.dispute || trimmed.dispute);
      return FIELD_META.filter((field) => {
         if (field.key === 'dispute') return showDispute;
         if (field.key === 'energy') return showDispute;
         return true;
      });
   }, [baseline, trimmed]);

   const getChipStyle = useCallback((score?: string | null) => {
      switch (score) {
         case 'optimistic':
            return { bg: '#b7faccff', text: '#1b7b3c' };
         case 'pessimistic':
            return { bg: '#ffe5e5', text: '#a00000' };
         case 'mixed':
            return { bg: '#fff4e0', text: '#b46a00' };
         default:
            return { bg: '#ececf0', text: '#585870' };
      }
   }, []);

   const setField = useCallback(
      (key: FieldKey) => (value: string) => {
         setForm((prev) => ({ ...prev, [key]: value }));
         setJustSaved(false);
      },
      []
   );

   const startEditing = useCallback(() => {
      setEditSnapshot(form);
      setIsEditing(true);
      setJustSaved(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
   }, [form]);

   const handleSave = useCallback(async () => {
      if (!entry || !hasChanges) {
         setIsEditing(false);
         setEditSnapshot(null);
         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
         return;
      }
      const patch = FIELD_KEYS.reduce((acc, key) => {
         if (trimmed[key] !== baseline[key]) acc[key] = trimmed[key];
         return acc;
      }, {} as Partial<Entry>);

      await store.updateEntry(entry.id, patch);
      setJustSaved(true);
      setIsEditing(false);
      setEditSnapshot(null);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      KeyboardController.dismiss();
   }, [baseline, entry, hasChanges, store, trimmed]);

   const handleCancel = useCallback(() => {
      if (!isEditing) return;
      if (editSnapshot) setForm(editSnapshot);
      setIsEditing(false);
      setJustSaved(false);
      setEditSnapshot(null);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowAnalysis(false);
      KeyboardController.dismiss();
   }, [editSnapshot, isEditing]);

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
               {!isEditing ? (
                  <>
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
                  </>
               ) : (
                  <Text style={styles.statusText}>Editing</Text>
               )}
            </View>

            <View style={styles.actions}>
               {isEditing ? (
                  <Pressable
                     style={styles.cancelButton}
                     onPress={handleCancel}
                     hitSlop={8}
                  >
                     <Text style={styles.cancelLabel}>Cancel</Text>
                  </Pressable>
               ) : null}
               <Pressable
                  style={styles.saveButton}
                  onPress={isEditing ? handleSave : startEditing}
                  hitSlop={8}
               >
                  <Text style={styles.saveLabel}>
                     {isEditing ? 'Save' : 'Edit'}
                  </Text>
               </Pressable>
            </View>
         </View>

         {hasScrolled ? <View style={styles.divider} /> : null}

         <KeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={[{ paddingBottom: insets.bottom + 16 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bottomOffset={keyboardOffset}
            extraKeyboardSpace={12}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
         >
            {aiDisplayData ? (
               <View style={styles.inlineAnalysis}>
                  <Pressable
                     style={styles.inlineHeaderRow}
                     onPress={() => {
                        LayoutAnimation.configureNext(
                           LayoutAnimation.Presets.easeInEaseOut
                        );
                        setShowAnalysis((s) => !s);
                     }}
                  >
                     <Text style={styles.inlineHeading}>AI Analysis</Text>
                     <Text style={styles.inlineToggle}>
                        {showAnalysis ? 'Hide' : 'Show'}
                     </Text>
                  </Pressable>

                  {showAnalysis && aiDisplayData ? (
                     <View style={styles.inlineAnalysisBody}>
                        {aiDisplayData.analysis.emotionalLogic ? (
                           <Text style={styles.inlineBody}>
                              {aiDisplayData.analysis.emotionalLogic}
                           </Text>
                        ) : null}


                        <View style={styles.inlineStyleGroup}>
                           {(
                              [
                                 [
                                    'permanence',
                                    'How long it feels',
                                    analysis?.dimensions.permanence,
                                    '#FCA5A5',
                                 ],
                                 [
                                    'pervasiveness',
                                    'How big it feels',
                                    analysis?.dimensions.pervasiveness,
                                    '#93C5FD',
                                 ],
                                 [
                                    'personalization',
                                    'Where blame goes',
                                    analysis?.dimensions.personalization,
                                    '#C4B5FD',
                                 ],
                              ] as const
                           ).map(([key, label, dim, color]) => {
                              const chipStyle = getChipStyle(dim?.score);
                              return (
                                 <View style={styles.dimensionBlock} key={key}>
                                    <View style={styles.dimensionHeaderRow}>
                                       <Text style={styles.dimensionLabel}>
                                          {label}
                                       </Text>
                                       <View
                                          style={[
                                             styles.chip,
                                             { backgroundColor: chipStyle.bg },
                                          ]}
                                       >
                                          <Text
                                             style={[
                                                styles.chipText,
                                                { color: chipStyle.text },
                                             ]}
                                          >
                                             {dim?.score || 'n/a'}
                                          </Text>
                                       </View>
                                    </View>
                                    {dim?.detectedPhrase ? (
                                       <Text
                                          style={[
                                             styles.inlinePhrase,
                                             { backgroundColor: color + '55' },
                                          ]}
                                       >
                                          {dim.detectedPhrase}
                                       </Text>
                                    ) : null}
                                    {dim?.insight ? (
                                       <Text style={styles.inlineBody}>
                                          {dim.insight}
                                       </Text>
                                    ) : null}
                                 </View>
                              );
                           })}
                        </View>
                     </View>
                  ) : null}
               </View>
            ) : null}

            {visibleFields.map((field) => (
               <View style={styles.section} key={field.key}>
                  <Text style={styles.label}>{field.label}</Text>
                  <Text style={styles.subLabel}>{field.hint}</Text>
                  <TextInput
                     multiline
                     editable={isEditing}
                     value={form[field.key]}
                     onChangeText={setField(field.key)}
                     placeholder={field.placeholder}
                     style={[
                        styles.input,
                        isEditing ? styles.inputEdit : styles.inputReadOnly,
                        !isEditing &&
                           field.accent && {
                              backgroundColor: field.accent.backgroundColor,
                              borderColor: field.accent.borderColor,
                           },
                     ]}
                     scrollEnabled={isEditing}
                     textAlignVertical="top"
                  />
               </View>
            ))}

            {!entry.dispute?.trim() && (
               <>
                  <CTAButton id={entry.id} />
                  <AnalyzeButton id={entry.id} />
               </>
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
      backgroundColor: palette.cardGrey,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
   },
   aiResultTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
      color: palette.text,
   },
   aiResultText: {
      fontSize: 12,
      lineHeight: 16,
      color: palette.text,
      // optional: make it feel more "code-ish"
      fontFamily: Platform.select({
         ios: 'Menlo',
         android: 'monospace',
         default: 'System',
      }),
   },
   aiResultScroll: {
      maxHeight: 240,
   },
   aiSection: {
      gap: 6,
      marginBottom: 12,
   },
   aiSectionHeading: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.text,
   },
   aiBody: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.text,
   },
   aiSubtle: {
      fontSize: 12,
      lineHeight: 16,
      color: palette.hint,
   },
   aiBullet: {
      marginLeft: 2,
   },
   aiStyleGroup: {
      marginTop: 6,
      gap: 8,
   },
   aiStyleRow: {
      gap: 4,
   },
   aiStyleLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.text,
   },
   aiStyleContent: {
      gap: 2,
   },
   aiStyleChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: palette.cardGrey,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      fontSize: 12,
      color: palette.text,
      textTransform: 'capitalize',
   },
   inlineAnalysis: {
      marginBottom: 20,
      padding: 12,
      borderRadius: 12,
      backgroundColor: palette.cardGrey,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      gap: 6,
   },
   inlineAnalysisBody: {
      gap: 8,
   },
   dimensionBlock: {
      gap: 6,
      paddingVertical: 4,
   },
   dimensionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
   },
   dimensionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.text,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
   },
   chip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
   },
   chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.text,
      textTransform: 'capitalize',
   },
   inlinePhrase: {
      marginTop: 2,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
      fontSize: 12,
      color: palette.text,
   },
   inlineHeading: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.text,
   },
   inlineHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
   },
   inlineToggle: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.hint,
   },
   inlineBody: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.text,
   },
   inlineSubtle: {
      fontSize: 12,
      lineHeight: 16,
      color: palette.hint,
   },
   inlineStyleGroup: {
      marginTop: 4,
      gap: 8,
   },
   inlineStyleRow: {
      gap: 4,
   },
   inlineStyleLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.text,
   },
   inlineStyleChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: palette.cardGrey,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      fontSize: 12,
      color: palette.text,
      textTransform: 'capitalize',
   },

   container: {
      flex: 1,
      paddingHorizontal: 16,
      backgroundColor: palette.cardBg,
   },
   header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      position: 'relative',
   },
   backButton: {
      padding: 8,
      position: 'absolute',
      left: 0,
   },
   titleMeta: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
   },
   saveButton: {
      padding: 8,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      backgroundColor: palette.cardGrey,
   },
   saveLabel: {
      fontSize: 14,
      color: palette.text,
   },
   actions: {
      position: 'absolute',
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
   },
   cancelButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      backgroundColor: palette.cardGrey,
   },
   cancelLabel: {
      fontSize: 14,
      color: palette.text,
   },
   timeStamp: {
      fontSize: 16,
      color: palette.text,
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
      marginTop: 24,
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
      ...shadowSoft
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
      paddingHorizontal: 12,
      color: palette.text,
      fontSize: 14,
      lineHeight: 20,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
   },
   inputEdit: {
      backgroundColor: palette.cardInput,
      minHeight: 80,
      paddingVertical: 12,
   },
   inputReadOnly: {
      backgroundColor: palette.cardGrey,
      paddingVertical: 6,
      minHeight: undefined,
      height: undefined,
   },
   text: {
      fontSize: 14,
      color: palette.text,
   },
});
