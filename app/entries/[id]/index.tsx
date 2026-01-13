import CardNextButton from '@/components/buttons/CardNextButton';
import WideButton from '@/components/buttons/WideButton';
import {
   ABCDE_FIELD,
   ENTRY_CHAR_LIMITS,
   ENTRY_CHAR_WARN_MIN_REMAINING,
   ENTRY_CHAR_WARN_RATIO,
   MAX_AI_RETRIES,
   ROUTE_ENTRIES,
} from '@/components/constants';
import { AiInsightCard } from '@/components/entries/dispute/AiInsightCard';
import {
   TimelineItem,
   TimelinePivot,
   TimelineStepDef,
} from '@/components/entries/entry/Timeline';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { formatDateTimeWithWeekday } from '@/lib/date';
import { FieldTone, getFieldStyles } from '@/lib/theme';
import type { Entry } from '@/models/entry';
import { usePreferences } from '@/providers/PreferencesProvider';
import { router, useLocalSearchParams } from 'expo-router';
import {
   ArrowRight,
   ChevronDown,
   ChevronLeft,
   ChevronUp,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
   LayoutAnimation,
   Pressable,
   Text,
   TextInput,
   View,
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

const getCharCountMeta = (value: string, limit: number) => {
   const remaining = limit - value.length;
   const warnThreshold = Math.max(
      ENTRY_CHAR_WARN_MIN_REMAINING,
      Math.round(limit * ENTRY_CHAR_WARN_RATIO)
   );
   return { remaining, show: remaining <= warnThreshold };
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
   const { hapticsEnabled, hapticsAvailable, triggerHaptic } = usePreferences();

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
   const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(
      () => !entry?.dispute
   );
   const [editSnapshot, setEditSnapshot] = useState<Record<
      FieldKey,
      string
   > | null>(null);

   const startEditing = useCallback(() => {
      setEditSnapshot(form);
      setIsEditing(true);
      setIsHistoryExpanded(true);
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
      setIsHistoryExpanded(!entry.dispute);
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

   const trimmed = useMemo(
      () => buildFieldRecord((key) => form[key].trim()),
      [form]
   );
   const baseline = useMemo(
      () => buildFieldRecord((key) => (entry?.[key] ?? '').trim()),
      [entry]
   );
   const aiDisplayData = entry?.aiResponse ?? null;
   const hasDispute = Boolean(entry?.dispute);
   const showDispute = Boolean(baseline.dispute || trimmed.dispute);
   const shouldHideHistory = !isHistoryExpanded && !isEditing && hasDispute;
   const hasChanges = useMemo(
      () => FIELD_KEYS.some((key) => trimmed[key] !== baseline[key]),
      [baseline, trimmed]
   );

   // Create timeline data structure
   const timelineSteps = useMemo(() => {
      return ABCDE_FIELD.map(
         (f, idx) =>
            ({
               key: f.key,
               letter: LETTERS[idx],
               label: f.label,
               desc: f.hint,
               tone: getToneForKey(f.key),
            }) as TimelineStepDef
      ).filter((step) => {
         if (step.key === 'dispute' || step.key === 'energy')
            return showDispute;
         if (
            shouldHideHistory &&
            (step.key === 'belief' || step.key === 'consequence')
         ) {
            return false;
         }
         return true;
      });
   }, [shouldHideHistory, showDispute]);

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
      if (!entry) return;

      const nextExpandedState = !Boolean(trimmed.dispute || entry.dispute);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      if (!hasChanges) {
         setIsEditing(false);
         setEditSnapshot(null);
         setIsHistoryExpanded(nextExpandedState);
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
      setIsHistoryExpanded(nextExpandedState);
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (editSnapshot) setForm(editSnapshot);
      setIsEditing(false);
      setJustSaved(false);
      setEditSnapshot(null);
      setIsHistoryExpanded(!hasDispute);
      KeyboardController.dismiss();
   }, [editSnapshot, hasDispute, isEditing]);

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
               <Text
                  className={`text-[13px] text-slate-500 dark:text-slate-400 absolute top-full mt-1 w-[200px] text-center ${!statusMessage ? 'opacity-0' : 'opacity-100'}`}
                  numberOfLines={1}
               >
                  {statusDisplay}
               </Text>
            </View>

            <View className="absolute right-4 flex-row items-center gap-2">
               {isEditing ? (
                  <>
                     <Pressable
                        onPress={handleCancel}
                        className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
                     >
                        <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">
                           Cancel
                        </Text>
                     </Pressable>
                     <Pressable
                        onPress={hasChanges ? handleSave : undefined}
                        disabled={!hasChanges}
                        className={`px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 ${hasChanges ? '' : 'opacity-50'}`}
                     >
                        <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">
                           Save
                        </Text>
                     </Pressable>
                  </>
               ) : (
                  <Pressable
                     onPress={startEditing}
                     className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
                  >
                     <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Edit
                     </Text>
                  </Pressable>
               )}
            </View>

            {hasScrolled && (
               <View className="absolute bottom-0 left-0 right-0 h-[1px] bg-slate-200 dark:bg-slate-800" />
            )}
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
               const isNeutral =
                  step.tone === 'default' || step.tone === 'neutral';
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
               const charLimit =
                  ENTRY_CHAR_LIMITS[step.key as keyof typeof ENTRY_CHAR_LIMITS];
               const charMeta = getCharCountMeta(effectiveValue, charLimit);
               const counterClassName =
                  charMeta.remaining <= 0
                     ? 'text-rose-600 dark:text-rose-400'
                     : 'text-amber-600 dark:text-amber-400';

               return (
                  <View key={step.key}>
                     <TimelineItem step={step} variant="full">
                        {isEditing ? (
                           <View>
                              <TextInput
                                 multiline
                                 value={effectiveValue} // Masked value for Input
                                 onChangeText={setField(step.key as FieldKey)}
                                 placeholder={`Write your ${step.label.toLowerCase()} here...`}
                                 placeholderTextColor={
                                    isDark ? '#94a3b8' : '#64748b'
                                 }
                                 className={`min-h-[48px] rounded-lg px-3 py-2 text-sm leading-6 ${finalBg} ${fieldStyles.text}`}
                                 scrollEnabled={false}
                                 textAlignVertical="top"
                                 autoCorrect
                                 maxLength={charLimit}
                              />
                              {charMeta.show && (
                                 <View className="mt-1 flex-row justify-end">
                                    <Text
                                       className={`text-[11px] font-medium ${counterClassName}`}
                                    >
                                       {effectiveValue.length}/{charLimit}
                                    </Text>
                                 </View>
                              )}
                           </View>
                        ) : (
                           <View
                              className={`min-h-[48px] rounded-lg px-3 py-2 ${finalBg}`}
                           >
                              <Text
                                 className={`text-sm leading-6 ${fieldStyles.text}`}
                              >
                                 {/* Masked value for Display */}
                                 {effectiveValue || (
                                    <Text className="italic opacity-50">
                                       Empty
                                    </Text>
                                 )}
                              </Text>
                           </View>
                        )}
                     </TimelineItem>

                     {step.key === 'adversity' && hasDispute && !isEditing && (
                        <Pressable
                           onPress={() => {
                              LayoutAnimation.configureNext(
                                 LayoutAnimation.Presets.easeInEaseOut
                              );
                              setIsHistoryExpanded((prev) => !prev);
                           }}
                           className="mb-4 self-start flex-row items-center gap-2 rounded-full bg-slate-100 px-3 py-2 dark:bg-slate-800"
                        >
                           {isHistoryExpanded ? (
                              <ChevronUp size={16} color={iconColor} />
                           ) : (
                              <ChevronDown size={16} color={iconColor} />
                           )}
                           <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {isHistoryExpanded
                                 ? 'Hide Belief & Consequence'
                                 : 'Show Belief & Consequence'}
                           </Text>
                        </Pressable>
                     )}


                     {/* PIVOT POINT */}
                     {step.key === 'consequence' && (
                        <View>
                           {/* AI Pivot */}
                           {aiDisplayData && (
                              <TimelinePivot variant="full">
                                 {/* HEADER REMOVED: AiInsightCard now handles it internally */}
                                 <AiInsightCard
                                    entryId={entry.id}
                                    data={aiDisplayData}
                                    onRefresh={
                                       entry.dispute || isEditing
                                          ? undefined
                                          : handleOpenDisputeAndUpdate
                                    }
                                    retryCount={entry.aiRetryCount ?? 0}
                                    maxRetries={MAX_AI_RETRIES}
                                    updatedAt={entry.updatedAt}
                                    allowMinimize={!!entry.dispute}
                                    initiallyMinimized={!!entry.dispute}
                                 />
                              </TimelinePivot>
                           )}

                           {/* Continue Button Logic */}
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
