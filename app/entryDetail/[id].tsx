import CardNextButton from '@/components/buttons/CardNextButton';
import LeftBackChevron from '@/components/buttons/LeftBackChevron';
import NewDisputeLink from '@/components/buttons/NewDisputeLink';
import WideButton from '@/components/buttons/WideButton';
import { ABCDE_FIELD, MAX_AI_RETRIES, ROUTE_HOME } from '@/lib/constants';

import { EntryField } from '@/components/entries/details/EntryField';
import { InsightStrip } from '@/components/entries/details/InsightStrip';
import {
   TimelinePivot,
   TimelineStepDef,
} from '@/components/entries/details/Timeline';
import { AiInsightCard } from '@/components/entries/dispute/AiInsightCard';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { formatDateTimeWithWeekday } from '@/lib/date';
import {
   AI_ANALYSIS_AMBER_ICON_DARK,
   AI_ANALYSIS_AMBER_ICON_LIGHT_ALT,
   AI_ANALYSIS_AMBER_PIVOT_BG_CLASS,
   AI_ANALYSIS_AMBER_PIVOT_BORDER_CLASS,
   AI_ANALYSIS_AMBER_PIVOT_TEXT_CLASS,
   ANALYZE_WITH_AI_LABEL,
   CATEGORY_COLOR_MAP,
   DEFAULT_CATEGORY_COLOR,
   ICON_COLOR_DARK,
   ICON_COLOR_LIGHT,
   SAVE_TO_ANALYZE_LABEL,
} from '@/lib/styles';
import { FieldTone } from '@/lib/theme';
import type { Entry } from '@/models/entry';
import { useAuth } from '@/providers/AuthProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ChevronDown, Sparkles, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, LayoutAnimation, Pressable, Text, View } from 'react-native';
import {
   KeyboardAwareScrollView,
   KeyboardController,
   useResizeMode,
} from 'react-native-keyboard-controller';
import Animated, {
   Easing,
   useAnimatedStyle,
   useSharedValue,
   withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FieldKey = (typeof ABCDE_FIELD)[number]['key'];
const FIELD_KEYS: FieldKey[] = ABCDE_FIELD.map((f) => f.key);
const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

// --- Helpers for Form Logic ---
function buildFieldRecord(getValue: (key: FieldKey) => string) {
   return FIELD_KEYS.reduce(
      (acc, key) => {
         acc[key] = getValue(key);
         return acc;
      },
      {} as Record<FieldKey, string>,
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
   useResizeMode();
   const entryId = Array.isArray(id) ? id[0] : id;
   const modeParam = Array.isArray(mode) ? mode[0] : mode;
   const startInEdit = modeParam === 'edit';
   const initialEditApplied = useRef(false);

   const store = useEntries();
   const entry = entryId ? store.getEntryById(entryId) : undefined;

   const { lock: lockNavigation } = useNavigationLock();
   const { hapticsEnabled, hapticsAvailable, triggerHaptic } = usePreferences();

   // --- Auth & Subscription ---
   const { status } = useAuth();
   const { isGrowthPlusActive } = useRevenueCat();
   const isSubscribed = status === 'signedIn' && isGrowthPlusActive;

   const insets = useSafeAreaInsets();
   const keyboardOffset = insets.bottom + 32;

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? ICON_COLOR_DARK : ICON_COLOR_LIGHT;

   // --- Form State ---
   const [form, setForm] = useState<Record<FieldKey, string>>(() =>
      buildFieldRecord((key) => entry?.[key] ?? ''),
   );
   const [justSaved, setJustSaved] = useState(false);
   const [hasScrolled, setHasScrolled] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [editSnapshot, setEditSnapshot] = useState<Record<
      FieldKey,
      string
   > | null>(null);

   // --- Animations ---
   const headerTranslateY = useSharedValue(-150); // Start hidden above screen

   // --- Collapse State for Disputes ---
   const [historyExpanded, setHistoryExpanded] = useState(false);

   // --- AI Visuals Data ---
   const isAnalyzed = !!entry?.aiResponse;
   const category = entry?.aiResponse?.meta?.category || 'Uncategorized';
   const catColor = CATEGORY_COLOR_MAP[category] || DEFAULT_CATEGORY_COLOR;
   const tags = entry?.aiResponse?.meta?.tags || [];

   // --- Derived Memoized Values ---
   const formattedTimestamp = useMemo(
      () => (entry ? formatDateTimeWithWeekday(entry.createdAt) : ''),
      [entry],
   );

   const trimmed = useMemo(
      () => buildFieldRecord((key) => form[key].trim()),
      [form],
   );
   const baseline = useMemo(
      () => buildFieldRecord((key) => (entry?.[key] ?? '').trim()),
      [entry],
   );
   const aiDisplayData = entry?.aiResponse ?? null;
   const showDispute = Boolean(baseline.dispute || trimmed.dispute);

   const hasChanges = useMemo(
      () => FIELD_KEYS.some((key) => trimmed[key] !== baseline[key]),
      [baseline, trimmed],
   );

   const timelineSteps = useMemo(() => {
      return ABCDE_FIELD.map(
         (f, idx) =>
            ({
               key: f.key,
               letter: LETTERS[idx],
               label: f.label,
               desc: f.hint,
               tone: getToneForKey(f.key),
            }) as TimelineStepDef,
      ).filter((step) => {
         if (step.key === 'dispute' || step.key === 'energy')
            return showDispute;
         return true;
      });
   }, [showDispute]);

   // --- Callbacks ---

   const toggleHistory = useCallback(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setHistoryExpanded((prev) => !prev);
   }, []);

   const handleAnalyze = useCallback(() => {
      if (!entry) return;
      lockNavigation(() => {
         if (isSubscribed) {
            router.push({
               pathname: '/dispute/[id]',
               params: {
                  id: entry.id,
                  view: 'analysis',
                  refresh: 'true',
                  from: 'entryDetail',
               },
            });
            return;
         }
         router.push({
            pathname: '/(modal)/free-user',
            params: {
               id: entry.id,
               onlyShowAiAnalysis: 'true',
               from: 'entryDetail',
            },
         });
      });
   }, [isSubscribed, entry, lockNavigation]);

   // OPTIMIZATION: Memoized field updater to prevent full re-renders on typing
   const handleFieldChange = useCallback((key: string, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setJustSaved(false);
   }, []);

   const startEditing = useCallback(() => {
      setEditSnapshot(form);
      setIsEditing(true);
      setJustSaved(false);
      headerTranslateY.value = withTiming(0, {
         duration: 300,
         easing: Easing.out(Easing.cubic),
      });
   }, [form, headerTranslateY]);

   const handleSave = useCallback(async () => {
      if (!entry) return;

      if (!hasChanges) {
         setIsEditing(false);
         setEditSnapshot(null);
         headerTranslateY.value = withTiming(-150);
         return;
      }

      const patch = FIELD_KEYS.reduce((acc, key) => {
         let newValue = trimmed[key];
         const previousValue = baseline[key];
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
      KeyboardController.dismiss();
      headerTranslateY.value = withTiming(-150);
   }, [
      baseline,
      entry,
      hapticsAvailable,
      hapticsEnabled,
      hasChanges,
      store,
      triggerHaptic,
      trimmed,
      headerTranslateY,
   ]);

   const handleCancel = useCallback(() => {
      if (!isEditing) return;
      if (editSnapshot) setForm(editSnapshot);
      setIsEditing(false);
      setJustSaved(false);
      setEditSnapshot(null);
      KeyboardController.dismiss();
      headerTranslateY.value = withTiming(-150);
   }, [editSnapshot, isEditing, headerTranslateY]);

   const handleCloseAttempt = useCallback(() => {
      if (hasChanges) {
         Alert.alert(
            'Discard Changes?',
            'You have unsaved changes. Are you sure you want to discard them?',
            [
               { text: 'Keep Editing', style: 'cancel' },
               { text: 'Discard', style: 'destructive', onPress: handleCancel },
            ],
         );
      } else {
         handleCancel();
      }
   }, [hasChanges, handleCancel]);

   const navigateToEntries = useCallback(() => {
      if (router.canGoBack()) {
         router.back();
         return;
      }
      router.replace(ROUTE_HOME);
   }, []);

   const handleDelete = useCallback(() => {
      if (!entry) return;

      Alert.alert(
         'Delete Entry',
         'Are you sure you want to delete this entry?',
         [
            { text: 'Cancel', style: 'cancel' },
            {
               text: 'Delete',
               style: 'destructive',
               onPress: async () => {
                  try {
                     await store.deleteEntry(entry.id);
                     if (hapticsEnabled && hapticsAvailable) triggerHaptic();
                     navigateToEntries();
                  } catch (error) {
                     console.error('Failed to delete entry:', error);
                  }
               },
            },
         ],
      );
   }, [
      entry,
      store,
      hapticsEnabled,
      hapticsAvailable,
      triggerHaptic,
      navigateToEntries,
   ]);

   const handleOpenDisputeAndUpdate = useCallback(() => {
      if (!entry) return;
      lockNavigation(() => {
         router.push({
            pathname: '/dispute/[id]',
            params: {
               id: entry.id,
               view: 'analysis',
               refresh: 'true',
               from: 'entryDetail',
            },
         });
      });
   }, [entry, lockNavigation]);

   const handleContinueToDispute = useCallback(() => {
      if (!entryId) return;
      lockNavigation(() => {
         router.push({
            pathname: '/dispute/[id]',
            params: { id: entryId, from: 'entryDetail' },
         });
      });
   }, [entryId, lockNavigation]);

   const handleStartNewDispute = useCallback(() => {
      if (!entryId) return;
      lockNavigation(() => {
         router.push({
            pathname: '/dispute/[id]',
            params: { id: entryId, newDispute: 'true', from: 'entryDetail' },
         });
      });
   }, [entryId, lockNavigation]);

   const handleScroll = useCallback(
      (e: any) => {
         const y = e?.nativeEvent?.contentOffset?.y ?? 0;
         if (y <= 0 && hasScrolled) setHasScrolled(false);
         else if (y > 0 && !hasScrolled) setHasScrolled(true);
      },
      [hasScrolled],
   );

   const stickyHeaderStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: headerTranslateY.value }],
   }));

   useEffect(() => {
      if (!entry) return;
      setForm(buildFieldRecord((key) => entry[key] ?? ''));
      setJustSaved(false);
      setHasScrolled(false);
      setIsEditing(false);
      setEditSnapshot(null);
      setHistoryExpanded(false);
      headerTranslateY.value = -150;
   }, [entry, headerTranslateY]);

   useEffect(() => {
      initialEditApplied.current = false;
   }, [entryId]);

   useEffect(() => {
      if (!entry) return;
      if (!startInEdit || initialEditApplied.current) return;
      initialEditApplied.current = true;
      startEditing();
   }, [entry, startEditing, startInEdit]);

   useEffect(() => {
      if (!justSaved) return;
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
   }, [justSaved]);

   if (!entry) {
      return <View />;
   }

   const statusMessage = justSaved
      ? 'Saved'
      : hasChanges
        ? 'Unsaved changes'
        : '';

   const disputeHistory = entry.disputeHistory ?? [];
   const hasDisputeHistory = disputeHistory.length > 0;
   const hasDispute = (entry.dispute ?? '').trim().length > 0;

   return (
      <View className="flex-1 bg-white dark:bg-slate-900">
         {/* 1. MAIN CONTENT (Bottom Layer) */}
         <KeyboardAwareScrollView
            className="flex-1"
            contentContainerStyle={[{ paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
            bottomOffset={keyboardOffset}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
         >
            <View style={{ height: insets.top }} />

            {/* === DEFAULT HEADER (Scrollable) === */}
            <View className="h-14 flex-row items-center justify-between px-4 mb-2">
               <View className="flex-1 items-start justify-center">
                  <LeftBackChevron
                     isDark={isDark}
                     onPress={navigateToEntries}
                  />
               </View>

               <View className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center pointer-events-none z-0">
                  <View className="items-center justify-center gap-1">
                     <Text className="text-base text-slate-900 dark:text-slate-100 font-medium">
                        {formattedTimestamp || ' '}
                     </Text>
                  </View>
               </View>

               <View className="flex-1 items-end justify-center">
                  <Pressable
                     onPress={startEditing}
                     className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  >
                     <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Edit
                     </Text>
                  </Pressable>
               </View>
            </View>

            <View className="px-4">
               {/* Insight Strip */}
               {isAnalyzed && (
                  <InsightStrip
                     category={category}
                     tags={tags}
                     catColor={catColor}
                     isDark={isDark}
                  />
               )}

               {/* Entry Fields */}
               {timelineSteps.map((step) => {
                  const rawValue = form[step.key as FieldKey];

                  return (
                     <EntryField
                        key={step.key}
                        step={step}
                        value={rawValue}
                        isEditing={isEditing}
                        isDark={isDark}
                        onChangeText={handleFieldChange}
                     >
                        {step.key === 'consequence' && (
                           <View>
                              {aiDisplayData && (
                                 <TimelinePivot variant="full">
                                    <AiInsightCard
                                       entryId={entry.id}
                                       data={aiDisplayData}
                                       onRefresh={
                                          isEditing
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

                              {!aiDisplayData && entry?.dispute && (
                                 <TimelinePivot
                                    variant="full"
                                    bgClassName={`${AI_ANALYSIS_AMBER_PIVOT_BG_CLASS} ${isEditing ? 'opacity-50' : ''}`}
                                    borderClassName={`${AI_ANALYSIS_AMBER_PIVOT_BORDER_CLASS} ${isEditing ? 'opacity-50' : ''}`}
                                 >
                                    <Pressable
                                       onPress={handleAnalyze}
                                       disabled={isEditing}
                                       className={`flex-row items-center justify-center gap-2 py-1 ${isEditing ? 'opacity-40' : 'active:opacity-50'}`}
                                    >
                                       <Sparkles
                                          size={18}
                                          color={
                                             isDark
                                                ? AI_ANALYSIS_AMBER_ICON_DARK
                                                : AI_ANALYSIS_AMBER_ICON_LIGHT_ALT
                                          }
                                          strokeWidth={2.5}
                                       />
                                       <Text
                                          className={`text-[12px] font-bold ${AI_ANALYSIS_AMBER_PIVOT_TEXT_CLASS}`}
                                       >
                                          {isEditing
                                             ? SAVE_TO_ANALYZE_LABEL
                                             : ANALYZE_WITH_AI_LABEL}
                                       </Text>
                                    </Pressable>
                                 </TimelinePivot>
                              )}

                              {!entry.dispute && !isEditing && (
                                 <View className="mt-4 mb-2">
                                    {aiDisplayData ? (
                                       <WideButton
                                          label="Continue"
                                          icon={ArrowRight}
                                          onPress={handleContinueToDispute}
                                       />
                                    ) : (
                                       <CardNextButton
                                          id={entry.id}
                                          fromEntryDetail
                                       />
                                    )}
                                 </View>
                              )}
                           </View>
                        )}

                        {step.key === 'energy' && hasDisputeHistory && (
                           <View className="mb-2">
                              <View className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                                 <Pressable
                                    onPress={toggleHistory}
                                    className="flex-row items-center justify-between px-4 py-3 active:bg-slate-100 dark:active:bg-slate-800/80"
                                 >
                                    <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                       Previous Disputes (
                                       {disputeHistory.length})
                                    </Text>
                                    <View
                                       style={{
                                          transform: [
                                             {
                                                rotate: historyExpanded
                                                   ? '180deg'
                                                   : '0deg',
                                             },
                                          ],
                                       }}
                                    >
                                       <ChevronDown
                                          size={16}
                                          color={isDark ? '#94a3b8' : '#64748b'}
                                       />
                                    </View>
                                 </Pressable>

                                 {historyExpanded && (
                                    <View className="gap-3 px-4 pb-4 pt-1">
                                       {disputeHistory.map(
                                          (item: any, index: number) => {
                                             const energyText = (
                                                item.energy ?? ''
                                             ).trim();
                                             return (
                                                <View
                                                   key={`${item.createdAt}-${index}`}
                                                   className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                                                >
                                                   <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                      {formatDateTimeWithWeekday(
                                                         item.createdAt,
                                                      )}
                                                   </Text>
                                                   <Text className="text-sm leading-5 text-slate-700 dark:text-slate-200">
                                                      {item.dispute}
                                                   </Text>
                                                   {energyText ? (
                                                      <Text className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                         Energy: {energyText}
                                                      </Text>
                                                   ) : null}
                                                </View>
                                             );
                                          },
                                       )}
                                    </View>
                                 )}
                              </View>
                           </View>
                        )}
                     </EntryField>
                  );
               })}

               {hasDispute && !isEditing && (
                  <View className="pt-8">
                     <NewDisputeLink onPress={handleStartNewDispute} />
                  </View>
               )}

               {/* DELETE ENTRY BUTTON */}
               {isEditing && (
                  <View className="pt-14  items-center">
                     <Pressable
                        onPress={handleDelete}
                        hitSlop={12}
                        className="active:opacity-60"
                     >
                        <Text className="text-xs font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400">
                           Delete Entry
                        </Text>
                     </Pressable>
                  </View>
               )}
            </View>
         </KeyboardAwareScrollView>

         {/* 2. STICKY HEADER (Top Layer)
            Absolute positioned. Animates in/out. Solid background.
         */}
         <Animated.View
            className="absolute top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 shadow-sm"
            style={[
               { paddingTop: insets.top, height: insets.top + 56 },
               stickyHeaderStyle,
            ]}
         >
            <View className="flex-1 flex-row items-center justify-between px-4">
               {/* Left: Close/X */}
               <View className="flex-1 items-start justify-center">
                  <Pressable
                     onPress={handleCloseAttempt}
                     hitSlop={12}
                     className="p-2 -ml-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800"
                  >
                     <X size={24} color={iconColor} />
                  </Pressable>
               </View>

               {/* Center: Title + Unsaved Status */}
               <View className="absolute left-0 right-0 bottom-0 h-[56px] items-center justify-center pointer-events-none z-0">
                  <View className="items-center justify-center pt-3">
                     <Text className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-5">
                        Editing
                     </Text>
                     <Text
                        className={`text-[11px] pt-1 text-amber-600 dark:text-amber-500 font-medium leading-3 ${statusMessage ? 'opacity-100' : 'opacity-0'}`}
                     >
                        {statusMessage || ' '}
                     </Text>
                  </View>
               </View>

               {/* Right: Save Button */}
               <View className="flex-1 items-end justify-center">
                  <Pressable
                     onPress={hasChanges ? handleSave : undefined}
                     disabled={!hasChanges}
                     className={`px-3 py-1.5 rounded-full bg-slate-700 dark:bg-slate-500 ${hasChanges ? '' : 'opacity-50'}`}
                  >
                     <Text className="text-sm font-bold text-white">Save</Text>
                  </Pressable>
               </View>
            </View>
         </Animated.View>
      </View>
   );
}
