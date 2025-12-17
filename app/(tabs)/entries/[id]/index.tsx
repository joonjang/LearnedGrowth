import NextButton from '@/components/buttons/NextButton';
import { ROUTE_ENTRIES } from '@/components/constants';
import { useEntries } from '@/hooks/useEntries';
import { formatDateTimeWithWeekday } from '@/lib/date';
import type { Entry } from '@/models/entry';
import { usePreferences } from '@/providers/PreferencesProvider';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
   LayoutAnimation,
   Platform,
   Pressable,
   Text,
   TextInput,
   UIManager,
   View,
} from 'react-native';
import {
   KeyboardAwareScrollView,
   KeyboardController,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
}[];

const FIELD_KEYS: FieldKey[] = FIELD_META.map((f) => f.key);

function buildFieldRecord(getValue: (key: FieldKey) => string) {
   return FIELD_KEYS.reduce(
      (acc, key) => {
         acc[key] = getValue(key);
         return acc;
      },
      {} as Record<FieldKey, string>
   );
}

export default function EntryDetailScreen() {
   // Enable LayoutAnimation for Android
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
   const {
      showAiAnalysis: aiVisible,
      hapticsEnabled,
      hapticsAvailable,
      triggerHaptic,
   } = usePreferences();

   const insets = useSafeAreaInsets();
   const keyboardOffset = insets.bottom + 32;

   // Theme Hooks
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#f8fafc' : '#0f172a'; // text vs text-inverse

   const [form, setForm] = useState<Record<FieldKey, string>>(() =>
      buildFieldRecord((key) => entry?.[key] ?? '')
   );
   const [justSaved, setJustSaved] = useState(false);
   const [hasScrolled, setHasScrolled] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [editSnapshot, setEditSnapshot] = useState<Record<
      FieldKey,
      string
   > | null>(null);

   useEffect(() => {
      if (!entry) return;
      setForm(buildFieldRecord((key) => entry[key] ?? ''));
      setJustSaved(false);
      setHasScrolled(false);
      setIsEditing(false);
      setEditSnapshot(null);
   }, [entry]);

   const trimmed = useMemo(
      () => buildFieldRecord((key) => form[key].trim()),
      [form]
   );

   const baseline = useMemo(
      () => buildFieldRecord((key) => (entry?.[key] ?? '').trim()),
      [entry]
   );

   const aiDisplayData = entry?.aiResponse ?? null;
   const analysis = aiDisplayData?.analysis ?? null;

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

   // Helper: Return Class Names for Chips
   const getChipClass = useCallback((score?: string | null) => {
      switch (score) {
         case 'optimistic':
            return { container: 'bg-dispute-bg', text: 'text-dispute-text' };
         case 'pessimistic':
            return { container: 'bg-belief-bg', text: 'text-belief-text' };
         case 'mixed':
            return {
               container: 'bg-zinc-50 dark:bg-slate-700',
               text: 'text-slate-900 dark:text-slate-100',
            };
         default:
            return {
               container: 'bg-slate-100 dark:bg-slate-800',
               text: 'text-slate-600 dark:text-slate-300',
            };
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
      if (hapticsEnabled && hapticsAvailable) {
         triggerHaptic();
      }
      setJustSaved(true);
      setIsEditing(false);
      setEditSnapshot(null);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      KeyboardController.dismiss();
   }, [
      baseline,
      entry,
      hapticsAvailable,
      hapticsEnabled,
      hasChanges,
      store,
      triggerHaptic,
      trimmed,
   ]);

   const handleCancel = useCallback(() => {
      if (!isEditing) return;
      if (editSnapshot) setForm(editSnapshot);
      setIsEditing(false);
      setJustSaved(false);
      setEditSnapshot(null);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
         <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
            <Text className="text-slate-900 dark:text-slate-100">
               Entry not found.
            </Text>
         </View>
      );
   }

   return (
      <View className="flex-1 px-4 bg-slate-50 dark:bg-slate-900">
         {/* Safe Area Spacer */}
         <View style={{ height: insets.top }} />

         {/* FIX 1: Header Movement 
            - Added 'h-11' to fix the container height.
            - Standardized text size to 'text-base' for both Edit/View states.
         */}
         <View className="h-11 flex-row items-center justify-center mb-4 relative z-10">
            <Pressable
               onPress={() => router.replace(ROUTE_ENTRIES)}
               hitSlop={8}
               className="absolute left-0 p-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800"
            >
               <Ionicons name="chevron-back" size={18} color={iconColor} />
            </Pressable>

            <View className="items-center justify-center gap-1 h-full">
               {!isEditing ? (
                  <>
                     <Text className="text-base text-slate-900 dark:text-slate-100 font-medium">
                        {formattedTimestamp || ' '}
                     </Text>
                     <Text
                        className={`text-[13px] text-slate-500 dark:text-slate-400 absolute top-full mt-1 ${
                           !statusMessage ? 'opacity-0' : 'opacity-100'
                        }`}
                     >
                        {statusDisplay}
                     </Text>
                  </>
               ) : (
                  <Text className="text-base text-slate-900 dark:text-slate-100 font-medium">
                     Editing
                  </Text>
               )}
            </View>

            <View className="absolute right-0 flex-row items-center gap-2">
               {isEditing && (
                  <Pressable
                     onPress={handleCancel}
                     hitSlop={8}
                     className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                  >
                     <Text className="text-sm text-slate-900 dark:text-slate-100">
                        Cancel
                     </Text>
                  </Pressable>
               )}
               <Pressable
                  onPress={isEditing ? handleSave : startEditing}
                  hitSlop={8}
                  className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
               >
                  <Text className="text-sm text-slate-900 dark:text-slate-100">
                     {isEditing ? 'Save' : 'Edit'}
                  </Text>
               </Pressable>
            </View>
         </View>

         {hasScrolled && (
            <View className="h-[1px] bg-slate-200 dark:bg-slate-700 mb-0" />
         )}

         <KeyboardAwareScrollView
            className="flex-1 pt-6 p-1"
            contentContainerStyle={[{ paddingBottom: insets.bottom + 16 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bottomOffset={keyboardOffset}
            extraKeyboardSpace={12}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
         >
            {/* Form Fields */}
            {visibleFields.map((field) => {
               // 1. Text Color & Weight
               let textColorClass = 'text-slate-900 dark:text-slate-100';
               if (!isEditing) {
                  if (field.key === 'belief')
                     textColorClass = 'text-belief-text font-semibold';
                  if (field.key === 'dispute')
                     textColorClass = 'text-dispute-text font-semibold';
               }

               // 2. Container Style (Background, Border Color, Spacing)
               let containerClass = '';

               if (isEditing) {
                  // Edit Mode: Standard look for all fields
                  containerClass =
                     'bg-zinc-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 min-h-[80px] py-3';
               } else {
                  // View Mode: Custom colors for Belief/Dispute, Standard for others
                  if (field.key === 'belief') {
                     containerClass =
                        'bg-belief-bg border-belief-border py-3 min-h-0 h-auto';
                  } else if (field.key === 'dispute') {
                     containerClass =
                        'bg-dispute-bg border-dispute-border py-3 min-h-0 h-auto';
                  } else {
                     // Normal fields (Adversity, etc.)
                     containerClass =
                        'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 py-3 min-h-0 h-auto';
                  }
               }

               return (
                  <View
                     className="mb-4 gap-1"
                     key={`${field.key}-${isEditing ? 'edit' : 'view'}`}
                  >
                     <Text className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                        {field.label}
                     </Text>
                     <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                        {field.hint}
                     </Text>

                     {isEditing ? (
                        <TextInput
                           multiline
                           value={form[field.key]}
                           onChangeText={setField(field.key)}
                           placeholder={field.placeholder}
                           placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                           className={`mt-1.5 px-3 text-sm leading-5 rounded-xl border shadow-sm ${containerClass} ${textColorClass}`}
                           scrollEnabled={true}
                           textAlignVertical="top"
                        />
                     ) : (
                        /* FIX 2: Disable Touch-to-Edit 
                           - Changed Pressable to View
                           - Removed onPress event
                        */
                        <View
                           className={`mt-1.5 px-3 rounded-xl border shadow-sm ${containerClass}`}
                        >
                           <Text
                              className={`text-sm leading-5 ${textColorClass}`}
                           >
                              {form[field.key] || (
                                 <Text className="italic opacity-50 text-slate-400">
                                    Empty
                                 </Text>
                              )}
                           </Text>
                        </View>
                     )}
                  </View>
               );
            })}

            {/* Inline AI Analysis */}
            {aiVisible && aiDisplayData ? (
               <View className="my-6 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border shadow-sm border-slate-200 dark:border-slate-700 gap-1.5">
                  <View className="flex-row items-center justify-between mb-1">
                     <Text className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                        AI Analysis
                     </Text>
                     <Ionicons
                        name="sparkles"
                        size={14}
                        color={isDark ? '#fbbf24' : '#d97706'}
                     />
                  </View>

                  <View className="gap-2">
                     <Text className="text-[13px] leading-5 text-slate-900 dark:text-slate-100">
                        {aiDisplayData.analysis.emotionalLogic}
                     </Text>

                     <View className="mt-1 gap-2">
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
                           // Extract class string from helper
                           const chipClass = getChipClass(dim?.score);

                           return (
                              <View className="gap-1.5 py-1" key={key}>
                                 <View className="flex-row items-center justify-between gap-2">
                                    <Text className="text-xs font-bold text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded-md">
                                       {label}
                                    </Text>
                                    <View
                                       className={`px-2 py-1 rounded-full ${chipClass.container}`}
                                    >
                                       <Text
                                          className={`text-xs font-bold capitalize ${chipClass.text}`}
                                       >
                                          {dim?.score || 'n/a'}
                                       </Text>
                                    </View>
                                 </View>
                                 {dim?.detectedPhrase ? (
                                    <Text
                                       className="mt-0.5 px-2 py-1.5 rounded-lg text-xs text-slate-900 dark:text-slate-100 overflow-hidden"
                                       style={{
                                          backgroundColor: color + '55',
                                       }}
                                    >
                                       &quot;{dim.detectedPhrase}&quot;
                                    </Text>
                                 ) : null}
                                 {dim?.insight ? (
                                    <Text className="text-[13px] leading-5 text-slate-900 dark:text-slate-100">
                                       {dim.insight}
                                    </Text>
                                 ) : null}
                              </View>
                           );
                        })}
                     </View>

                     {aiDisplayData.suggestions.counterBelief && (
                        <View className="mt-4 gap-2">
                           <Text className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                              Another way to see it
                           </Text>

                           <View className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                              <Text className="text-[14px] leading-5 text-slate-900 dark:text-slate-100">
                                 {aiDisplayData.suggestions.counterBelief}
                              </Text>
                           </View>
                        </View>
                     )}
                  </View>
               </View>
            ) : null}

            {!entry.dispute?.trim() && (
               <>
                  <NextButton id={entry.id} />
               </>
            )}
         </KeyboardAwareScrollView>
      </View>
   );
}
