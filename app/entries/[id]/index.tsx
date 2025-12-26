import CardNextButton from '@/components/buttons/CardNextButton';
import WideButton from '@/components/buttons/WideButton';
import { ABCDE_FIELD, MAX_AI_RETRIES, ROUTE_ENTRIES } from '@/components/constants';
import { AiInsightCard } from '@/components/entries/dispute/AiInsightCard';
import { TimelineItem, TimelinePivot, TimelineStepDef } from '@/components/entries/entry/Timeline';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { formatDateTimeWithWeekday } from '@/lib/date';
import { FieldTone, getFieldStyles } from '@/lib/theme';
import type { Entry } from '@/models/entry';
import { usePreferences } from '@/providers/PreferencesProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
   LayoutAnimation,
   Pressable,
   Text,
   TextInput,
   View
} from 'react-native';
import {
   KeyboardAwareScrollView,
   KeyboardController,
   useResizeMode,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FieldKey = (typeof ABCDE_FIELD)[number]['key'];
const FIELD_KEYS: FieldKey[] = ABCDE_FIELD.map((f) => f.key);
const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

function buildFieldRecord(getValue: (key: FieldKey) => string) {
   return FIELD_KEYS.reduce(
      (acc, key) => {
         acc[key] = getValue(key);
         return acc;
      },
      {} as Record<FieldKey, string>
   );
}

const getToneForKey = (key: FieldKey): FieldTone => {
   if (key === 'belief') return 'belief';
   if (key === 'dispute') return 'dispute';
   if (key === 'energy') return 'energy';
   return 'default';
};

export default function EntryDetailScreen() {
   const { id, mode } = useLocalSearchParams();
   // Ensure Android uses adjustResize so the keyboard doesn't cover inputs.
   useResizeMode();
   const entryId = Array.isArray(id) ? id[0] : id;
   const modeParam = Array.isArray(mode) ? mode[0] : mode;
   const startInEdit = modeParam === 'edit';
   const initialEditApplied = useRef(false);
   const store = useEntries();
   const entry = entryId ? store.getEntryById(entryId) : undefined;
   const { lock: lockNavigation } = useNavigationLock();
   const {
      showAiAnalysis: aiVisible,
      hapticsEnabled,
      hapticsAvailable,
      triggerHaptic,
   } = usePreferences();

   const insets = useSafeAreaInsets();
   const keyboardOffset = insets.bottom + 32;

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#f8fafc' : '#0f172a';

   const [form, setForm] = useState<Record<FieldKey, string>>(() =>
      buildFieldRecord((key) => entry?.[key] ?? '')
   );
   const [justSaved, setJustSaved] = useState(false);
   const [hasScrolled, setHasScrolled] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [editSnapshot, setEditSnapshot] = useState<Record<FieldKey,string> | null>(null);

   const startEditing = useCallback(() => {
      setEditSnapshot(form);
      setIsEditing(true);
      setJustSaved(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
   }, [form]);

   useEffect(() => {
      if (!entry) return;
      setForm(buildFieldRecord((key) => entry[key] ?? ''));
      setJustSaved(false);
      setHasScrolled(false);
      setIsEditing(false);
      setEditSnapshot(null);
   }, [entry]);

   useEffect(() => {
      initialEditApplied.current = false;
   }, [entryId]);

   useEffect(() => {
      if (!entry) return;
      if (!startInEdit || initialEditApplied.current) return;
      initialEditApplied.current = true;
      startEditing();
   }, [entry, startEditing, startInEdit]);

   const trimmed = useMemo(() => buildFieldRecord((key) => form[key].trim()), [form]);
   const baseline = useMemo(() => buildFieldRecord((key) => (entry?.[key] ?? '').trim()), [entry]);
   const aiDisplayData = entry?.aiResponse ?? null;
   const hasChanges = useMemo(() => FIELD_KEYS.some((key) => trimmed[key] !== baseline[key]), [baseline, trimmed]);

   // Create timeline data structure
   const timelineSteps = useMemo(() => {
      // Determine visibility based on content existence
      const showDispute = Boolean(baseline.dispute || trimmed.dispute); 
      
      return ABCDE_FIELD.map((f, idx) => ({
         key: f.key,
         letter: LETTERS[idx],
         label: f.label,
         desc: f.hint,
         tone: getToneForKey(f.key),
      } as TimelineStepDef)).filter(step => {
         if (step.key === 'dispute' || step.key === 'energy') return showDispute;
         return true;
      });
   }, [baseline, trimmed]);

   const setField = useCallback(
      (key: FieldKey) => (value: string) => {
         setForm((prev) => ({ ...prev, [key]: value }));
         setJustSaved(false);
      },
      []
   );

   const navigateToEntries = useCallback(() => {
      // Prefer a back/pop transition (slide from left). Fallback to replace if there's no history.
      if (router.canGoBack()) {
         router.back();
         return;
      }
      router.replace(ROUTE_ENTRIES);
   }, []);

   const handleSave = useCallback(async () => {
      if (!entry || !hasChanges) {
         setIsEditing(false);
         setEditSnapshot(null);
         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
         return;
      }

      const patch = FIELD_KEYS.reduce((acc, key) => {
         let newValue = trimmed[key];
         const previousValue = baseline[key];

         // If we had a dispute before, and the user clears it, force it to "Empty"
         // This ensures the field never becomes falsy for Layout logic
         if (key === 'dispute' && newValue === '' && !!previousValue) {
             newValue = 'Empty';
         }

         if (newValue !== previousValue) {
             acc[key] = newValue;
         }
         return acc;
      }, {} as Partial<Entry>);

      if (entry.aiResponse) {
         const coreFields: FieldKey[] = ['adversity', 'belief', 'consequence'];
         if (coreFields.some((key) => trimmed[key] !== baseline[key])) {
            patch.aiResponse = { ...entry.aiResponse, isStale: true };
         }
      }

      await store.updateEntry(entry.id, patch);
      if (hapticsEnabled && hapticsAvailable) triggerHaptic();
      setJustSaved(true);
      setIsEditing(false);
      setEditSnapshot(null);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      KeyboardController.dismiss();
   }, [baseline, entry, hapticsAvailable, hapticsEnabled, hasChanges, store, triggerHaptic, trimmed]);

   const handleCancel = useCallback(() => {
      if (!isEditing) return;
      if (editSnapshot) setForm(editSnapshot);
      setIsEditing(false);
      setJustSaved(false);
      setEditSnapshot(null);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      KeyboardController.dismiss();
   }, [editSnapshot, isEditing]);

   const handleOpenDisputeAndUpdate = useCallback(() => {
      if (!entry) return;
      lockNavigation(() => {
         router.push({
            pathname: '/dispute/[id]',
            params: { id: entry.id, view: 'analysis', refresh: 'true' },
         });
      });
   }, [entry, lockNavigation]);

   const handleContinueToDispute = useCallback(() => {
      if (!entryId) return;
      lockNavigation(() => {
         router.push({
            pathname: '/dispute/[id]',
            params: { id: entryId },
         });
      });
   }, [entryId, lockNavigation]);

   const formattedTimestamp = entry ? formatDateTimeWithWeekday(entry.createdAt) : '';
   const statusMessage = justSaved ? 'Saved' : hasChanges ? 'Unsaved changes' : '';
   const statusDisplay = statusMessage || 'Saved';

   useEffect(() => {
      if (!justSaved) return;
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
   }, [justSaved]);

   const handleScroll = useCallback((e: any) => {
      const y = e?.nativeEvent?.contentOffset?.y ?? 0;
      if (y <= 0 && hasScrolled) setHasScrolled(false);
      else if (y > 0 && !hasScrolled) setHasScrolled(true);
   }, [hasScrolled]);

   if (!entry) {
      return (
         <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
            <Text className="text-slate-900 dark:text-slate-100">Entry not found.</Text>
         </View>
      );
   }

   return (
      <View className="flex-1 bg-white dark:bg-slate-900">
         <View style={{ height: insets.top }} />

         {/* Header */}
         <View className="h-14 flex-row items-center justify-center relative z-10">
            <Pressable
               onPress={navigateToEntries}
               hitSlop={8}
               className="absolute left-4 p-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800"
            >
               <ChevronLeft size={20} color={iconColor} />
            </Pressable>

            <View className="items-center justify-center gap-1 h-full">
               <Text className="text-base text-slate-900 dark:text-slate-100 font-medium">
                  {isEditing ? 'Editing' : formattedTimestamp || ' '}
               </Text>
               <Text className={`text-[13px] text-slate-500 dark:text-slate-400 absolute top-full mt-1 w-[200px] text-center ${!statusMessage ? 'opacity-0' : 'opacity-100'}`} numberOfLines={1}>
                  {statusDisplay}
               </Text>
            </View>

            <View className="absolute right-4 flex-row items-center gap-2">
               {isEditing ? (
                  <>
                     <Pressable onPress={handleCancel} className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">Cancel</Text>
                     </Pressable>
                     <Pressable
                        onPress={hasChanges ? handleSave : undefined}
                        disabled={!hasChanges}
                        className={`px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 ${hasChanges ? '' : 'opacity-50'}`}
                     >
                        <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">Save</Text>
                     </Pressable>
                  </>
               ) : (
                  <Pressable onPress={startEditing} className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                     <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">Edit</Text>
                  </Pressable>
               )}
            </View>

            {hasScrolled && <View className="absolute bottom-0 left-0 right-0 h-[1px] bg-slate-200 dark:bg-slate-800" />}
         </View>

         {/* Content */}
         <KeyboardAwareScrollView
            className="flex-1 px-4 pt-4"
            contentContainerStyle={[{ paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
            bottomOffset={keyboardOffset}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
         >
            {timelineSteps.map((step) => {
               const fieldStyles = getFieldStyles(step.tone, isEditing);
               
               // Background logic
               const isNeutral = step.tone === 'default' || step.tone === 'neutral';
               const readOnlyBg = isNeutral 
                  ? 'bg-slate-50 dark:bg-slate-800' 
                  : 'bg-white/60 dark:bg-black/10';

               const finalBg = isEditing 
                  ? 'bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800'
                  : readOnlyBg;

               // --- MASKING LOGIC ---
               // Get raw value from form
               const rawValue = form[step.key as FieldKey];
               // If it's the specific "Empty" string, treat it as actual empty string
               const effectiveValue = rawValue === 'Empty' ? '' : rawValue;

               return (
                  <View key={step.key}>
                     <TimelineItem step={step} variant="full">
                        {isEditing ? (
                            <TextInput
                                multiline
                                value={effectiveValue} // Masked value for Input
                                onChangeText={setField(step.key as FieldKey)}
                                placeholder={`Write your ${step.label.toLowerCase()} here...`}
                                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                                className={`min-h-[48px] rounded-lg px-3 py-2 text-sm leading-6 ${finalBg} ${fieldStyles.text}`}
                                scrollEnabled={false}
                                textAlignVertical="top"
                                autoCorrect
                            />
                        ) : (
                            <View className={`min-h-[48px] rounded-lg px-3 py-2 ${finalBg}`}>
                                <Text className={`text-sm leading-6 ${fieldStyles.text}`}>
                                    {/* Masked value for Display */}
                                    {effectiveValue || <Text className="italic opacity-50">Empty</Text>}
                                </Text>
                            </View>
                        )}
                     </TimelineItem>

                     {/* PIVOT POINT */}
                     {step.key === 'consequence' && (
                        <View>
                           {/* AI Pivot */}
                           {aiVisible && aiDisplayData && (
                              <TimelinePivot variant="full">
                                    <View className="mb-2 flex-row items-center gap-2">
                                       <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                          AI Analysis
                                       </Text>
                                    </View>
                                    <AiInsightCard
                                       data={aiDisplayData}
                                       onRefresh={entry.dispute || isEditing ? undefined : handleOpenDisputeAndUpdate}
                                       retryCount={entry.aiRetryCount ?? 0}
                                       maxRetries={MAX_AI_RETRIES}
                                       updatedAt={entry.updatedAt}
                                    />
                              </TimelinePivot>
                           )}

                           {/* Continue Button Logic:
                             Show if dispute is ACTUALLY empty (falsy or "Empty") 
                             AND not currently editing.
                           */}
                           {!entry.dispute && !isEditing && (
                                 <View className="mt-4 mb-2">
                                    {aiDisplayData ? (
                                       <WideButton
                                          label="Continue"
                                          icon={ArrowRight}
                                          onPress={handleContinueToDispute}
                                       />
                                    ) : (
                                       <CardNextButton id={entry.id} />
                                    )}
                                 </View>
                           )}
                        </View>
                     )}
                  </View>
               );
            })}
         </KeyboardAwareScrollView>
      </View>
   );
}
