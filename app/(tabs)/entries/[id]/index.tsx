import CardNextButton from '@/components/buttons/CardNextButton';
import WideButton from '@/components/buttons/WideButton';
import { ABCDE_FIELD, MAX_AI_RETRIES, ROUTE_ENTRIES } from '@/components/constants';
import { AiInsightCard } from '@/components/entries/dispute/AiIngsightCard';
import { useEntries } from '@/hooks/useEntries';
import { formatDateTimeWithWeekday } from '@/lib/date';
import { getIosShadowStyle } from '@/lib/shadow';
import { FieldTone, getFieldStyles } from '@/lib/theme';
import type { Entry } from '@/models/entry';
import { usePreferences } from '@/providers/PreferencesProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FieldKey = (typeof ABCDE_FIELD)[number]['key'];

const FIELD_KEYS: FieldKey[] = ABCDE_FIELD.map((f) => f.key);

function buildFieldRecord(getValue: (key: FieldKey) => string) {
   return FIELD_KEYS.reduce(
      (acc, key) => {
         acc[key] = getValue(key);
         return acc;
      },
      {} as Record<FieldKey, string>
   );
}

// Helper to map DB keys to Theme Tones
const getToneForKey = (key: FieldKey): FieldTone => {
   if (key === 'belief') return 'belief';
   if (key === 'dispute') return 'dispute';
   if (key === 'energy') return 'energy';
   return 'default';
};

export default function EntryDetailScreen() {
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
   const iosShadowSm = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'sm' }),
      [isDark]
   );

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

   const hasChanges = useMemo(
      () => FIELD_KEYS.some((key) => trimmed[key] !== baseline[key]),
      [baseline, trimmed]
   );

   const visibleFields = useMemo(() => {
      const showDispute = Boolean(baseline.dispute || trimmed.dispute);
      return ABCDE_FIELD.filter((field) => {
         if (field.key === 'dispute') return showDispute;
         if (field.key === 'energy') return showDispute;
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

      if (entry.aiResponse) {
         const coreFields: FieldKey[] = ['adversity', 'belief', 'consequence'];

         const analysisChanged = coreFields.some(
            (key) => trimmed[key] !== baseline[key]
         );

         if (analysisChanged) {
            patch.aiResponse = {
               ...entry.aiResponse,
               isStale: true,
            };
         }
      }

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

   const handleOpenDisputeAndUpdate = useCallback(() => {
      if (!entry) return;

      router.push({
         pathname: '/dispute/[id]',
         params: { id: entry.id, view: 'analysis', refresh: 'true' },
      });
   }, [entry]);

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

   const handleContinueToDispute = () => {
      router.push({
         pathname: '/dispute/[id]',
         params: { id: entryId },
      });
   };

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
      <View className="flex-1 px-4 bg-white dark:bg-slate-900">
         {/* Safe Area Spacer */}
         <View style={{ height: insets.top }} />

         {/* 1. Header (No Extra Margins) */}
         <View className="h-14 flex-row items-center justify-center relative z-10">
            <Pressable
               onPress={() => router.replace(ROUTE_ENTRIES)}
               hitSlop={8}
               className="absolute left-0 p-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800"
               testID="detail-back-btn"
            >
               <ChevronLeft size={18} color={iconColor} />
            </Pressable>

            {/* Title Column - Contains both Time/Editing and Absolute Status Text */}
            <View className="items-center justify-center gap-1 h-full">
               <Text className="text-base text-slate-900 dark:text-slate-100 font-medium">
                  {isEditing ? 'Editing' : formattedTimestamp || ' '}
               </Text>
               <Text
                  className={`text-[13px] text-slate-500 dark:text-slate-400 absolute top-full mt-1 w-[200px] text-center ${
                     !statusMessage ? 'opacity-0' : 'opacity-100'
                  }`}
                  numberOfLines={1}
               >
                  {statusDisplay}
               </Text>
            </View>

            <View className="absolute right-0 flex-row items-center gap-2">
               {isEditing && (
                  <Pressable
                     onPress={handleCancel}
                     hitSlop={8}
                     className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                     testID="detail-cancel-btn"
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
                  testID="detail-action-btn"
               >
                  <Text className="text-sm text-slate-900 dark:text-slate-100">
                     {isEditing ? 'Save' : 'Edit'}
                  </Text>
               </Pressable>
            </View>

            {/* Divider: Absolute Bottom */}
            {hasScrolled && (
               <View className="absolute bottom-0 left-0 right-0 h-[1px] bg-slate-200 dark:bg-slate-700" />
            )}
         </View>

         <KeyboardAwareScrollView
            // pt-6: Creates space for the absolute status text so fields don't overlap it initially.
            // p-1: Horizontal/bottom padding.
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
               // --- USE SHARED THEME UTILITY ---
               const tone = getToneForKey(field.key);
               const styles = getFieldStyles(tone, isEditing);
               
               // Specific layout for detail screen (heights, padding)
               // This is strictly structural/layout, not thematic color.
               const layoutClass = isEditing 
                  ? 'min-h-[80px] py-3' 
                  : 'py-3 min-h-0 h-auto';

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
                           // Combine shared theme styles with local layout props
                           className={`mt-1.5 px-3 text-sm leading-5 rounded-xl border shadow-sm ${styles.container} ${styles.text} ${layoutClass}`}
                           style={iosShadowSm}
                           scrollEnabled={true}
                           textAlignVertical="top"
                        />
                     ) : (
                        <View
                           className={`mt-1.5 px-3 rounded-xl border shadow-sm ${styles.container} ${layoutClass}`}
                           style={iosShadowSm}
                        >
                           <Text
                              className={`text-sm leading-5 ${styles.text}`}
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
               <>
                  <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-5" />
                  <AiInsightCard
                     data={aiDisplayData}
                     onRefresh={entry.dispute || isEditing ? undefined : handleOpenDisputeAndUpdate}
                     retryCount={entry.aiRetryCount ?? 0}
                     maxRetries={MAX_AI_RETRIES}
                     updatedAt={entry.updatedAt}
                  />
               </>
            ) : null}

            {!entry.dispute?.trim() && (
               <>
                  {aiDisplayData ? (
                     <WideButton
                        label="Continue"
                        icon={ArrowRight}
                        onPress={handleContinueToDispute}
                     />
                  ) : (
                     <CardNextButton id={entry.id} />
                  )}
               </>
            )}
         </KeyboardAwareScrollView>
      </View>
   );
}