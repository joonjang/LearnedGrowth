import AnalyzeButton from '@/components/buttons/AnalyzeButton';
import CTAButton from '@/components/buttons/CTAButton';
import { useEntries } from '@/hooks/useEntries';
import { formatDateTimeWithWeekday } from '@/lib/date';
import type { Entry } from '@/models/entry';
import { usePreferences } from '@/providers/PreferencesProvider';
// REMOVED: import { makeThemedStyles, useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind'; // <--- Added
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
import {
   useSafeAreaInsets,
} from 'react-native-safe-area-context';

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
   return FIELD_KEYS.reduce((acc, key) => {
      acc[key] = getValue(key);
      return acc;
   }, {} as Record<FieldKey, string>);
}

export default function EntryDetailScreen() {
   useEffect(() => {
      if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
         UIManager.setLayoutAnimationEnabledExperimental(true);
      }
   }, []);

   const { id } = useLocalSearchParams();
   const entryId = Array.isArray(id) ? id[0] : id;
   const store = useEntries();
   const entry = entryId ? store.getEntryById(entryId) : undefined;
   const { showAiAnalysis: aiVisible, hapticsEnabled, hapticsAvailable, triggerHaptic } = usePreferences();
   
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
   const [editSnapshot, setEditSnapshot] = useState<Record<FieldKey, string> | null>(null);
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

   useEffect(() => {
      if (!aiVisible) {
         setShowAnalysis(false);
      }
   }, [aiVisible]);

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

   // Helper: Return Class Names instead of Style Objects
   const getAccentClass = useCallback(
      (key: FieldKey) => {
         if (key === 'belief') return "bg-belief-bg border-belief-border";
         if (key === 'dispute') return "bg-dispute-bg border-dispute-border";
         return "bg-card-grey border-transparent";
      },
      []
   );

   // Helper: Return Class Names for Chips
   const getChipClass = useCallback(
      (score?: string | null) => {
         switch (score) {
            case 'optimistic':
               return "bg-dispute-bg text-dispute-text";
            case 'pessimistic':
               return "bg-belief-bg text-belief-text";
            case 'mixed':
               return "bg-card-input text-text";
            default:
               return "bg-card-grey text-text-subtle";
         }
      },
      []
   );

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
   }, [baseline, entry, hapticsEnabled, hasChanges, store, trimmed]);

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

   const formattedTimestamp = entry ? formatDateTimeWithWeekday(entry.createdAt) : '';
   const statusMessage = justSaved ? 'Saved' : hasChanges ? 'Unsaved changes' : '';
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
         <View className="flex-1 items-center justify-center bg-background">
            <Text className="text-text">Entry not found.</Text>
         </View>
      );
   }

   return (
      <View className="flex-1 px-4 bg-background">
         {/* Safe Area Spacer */}
         <View style={{ height: insets.top }} />
         
         {/* Header */}
         <View className="flex-row items-center justify-center mb-4 relative z-10">
            <Pressable
               onPress={() => router.back()}
               hitSlop={8}
               className="absolute left-0 p-2 rounded-full active:bg-card-grey"
            >
               <Ionicons name="chevron-back" size={18} color={iconColor} />
            </Pressable>

            <View className="items-center gap-1">
               {!isEditing ? (
                  <>
                     <Text className="text-base text-text font-medium">
                        {formattedTimestamp || ' '}
                     </Text>
                     <Text className={`text-[13px] text-hint absolute mt-6 ${!statusMessage ? 'opacity-0' : 'opacity-100'}`}>
                        {statusDisplay}
                     </Text>
                  </>
               ) : (
                  <Text className="text-[13px] text-hint">Editing</Text>
               )}
            </View>

            <View className="absolute right-0 flex-row items-center gap-2">
               {isEditing && (
                  <Pressable
                     onPress={handleCancel}
                     hitSlop={8}
                     className="px-3 py-1.5 rounded-full border border-border bg-card-grey"
                  >
                     <Text className="text-sm text-text">Cancel</Text>
                  </Pressable>
               )}
               <Pressable
                  onPress={isEditing ? handleSave : startEditing}
                  hitSlop={8}
                  className="px-3 py-1.5 rounded-full border border-border bg-card-grey"
               >
                  <Text className="text-sm text-text">
                     {isEditing ? 'Save' : 'Edit'}
                  </Text>
               </Pressable>
            </View>
         </View>

         {hasScrolled && <View className="h-[1px] bg-border mb-0" />}

         <KeyboardAwareScrollView
            className="flex-1 pt-6"
            contentContainerStyle={[{ paddingBottom: insets.bottom + 16 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bottomOffset={keyboardOffset}
            extraKeyboardSpace={12}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
         >
            {/* Inline AI Analysis */}
            {aiVisible && aiDisplayData ? (
               <View className="mb-5 p-3 rounded-xl bg-card-grey border border-border gap-1.5">
                  <Pressable
                     className="flex-row items-center justify-between mb-1"
                     onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setShowAnalysis((s) => !s);
                     }}
                  >
                     <Text className="text-[13px] font-bold text-text">AI Analysis</Text>
                     <Text className="text-xs font-semibold text-hint">
                        {showAnalysis ? 'Hide' : 'Show'}
                     </Text>
                  </Pressable>

                  {showAnalysis && aiDisplayData ? (
                     <View className="gap-2">
                        {aiDisplayData.analysis.emotionalLogic ? (
                           <Text className="text-[13px] leading-5 text-text">
                              {aiDisplayData.analysis.emotionalLogic}
                           </Text>
                        ) : null}

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
                                       <Text className="text-xs font-bold text-text px-1.5 py-0.5 rounded-md">
                                          {label}
                                       </Text>
                                       <View className={`px-2 py-1 rounded-full ${chipClass.split(" ")[0]}`}>
                                          <Text className={`text-xs font-bold capitalize ${chipClass.split(" ")[1]}`}>
                                             {dim?.score || 'n/a'}
                                          </Text>
                                       </View>
                                    </View>
                                    {dim?.detectedPhrase ? (
                                       <Text
                                          className="mt-0.5 px-2 py-1.5 rounded-lg text-xs text-text overflow-hidden"
                                          style={{ backgroundColor: color + '55' }}
                                       >
                                          &quot;{dim.detectedPhrase}&quot;
                                       </Text>
                                    ) : null}
                                    {dim?.insight ? (
                                       <Text className="text-[13px] leading-5 text-text">
                                          {dim.insight}
                                       </Text>
                                    ) : null}
                                 </View>
                              );
                           })}
                        </View>

                        <View className="mt-4 gap-2">
                           <Text className="text-[13px] font-bold text-text">
                              Another way to see it
                           </Text>
                           {aiDisplayData.suggestions.counterBelief ? (
                              <View className="p-3 rounded-xl border border-border bg-card-bg shadow-sm">
                                 <Text className="text-[14px] leading-5 text-text">
                                    {aiDisplayData.suggestions.counterBelief}
                                 </Text>
                              </View>
                           ) : (
                              <Text className="text-sm text-hint">
                                 Tap “Analyze with AI” to get a counter-belief.
                              </Text>
                           )}
                        </View>
                     </View>
                  ) : null}
               </View>
            ) : null}

            {/* Form Fields */}
            {visibleFields.map((field) => {
               // Dynamic classes for input styling
               const editClass = isEditing 
                  ? "bg-card-input min-h-[80px] py-3" 
                  : `py-1.5 min-h-0 h-auto ${getAccentClass(field.key)}`;

               return (
                  <View className="mb-4 gap-1 shadow-sm" key={field.key}>
                     <Text className="text-[15px] font-bold text-text">{field.label}</Text>
                     <Text className="text-[13px] font-semibold text-hint">{field.hint}</Text>
                     
                     <TextInput
                        multiline
                        editable={isEditing}
                        value={form[field.key]}
                        onChangeText={setField(field.key)}
                        placeholder={field.placeholder}
                        placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                        className={`mt-1.5 px-3 text-sm text-text leading-5 rounded-xl border border-border ${editClass}`}
                        scrollEnabled={isEditing}
                        textAlignVertical="top"
                     />
                  </View>
               );
            })}

            {!entry.dispute?.trim() && (
               <>
                  <CTAButton id={entry.id} />
                  {aiVisible ? <AnalyzeButton id={entry.id} /> : null}
               </>
            )}

         </KeyboardAwareScrollView>
      </View>
   );
}