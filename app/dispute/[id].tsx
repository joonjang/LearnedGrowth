import rawAbcde from '@/assets/data/abcde.json';
import ABCAnalysis from '@/components/entries/dispute/ABCAnalysis';
import DisputeSteps from '@/components/entries/dispute/DisputeSteps';
import TopFade from '@/components/utils/TopFade';
import { useAbcAi } from '@/hooks/useAbcAi';
import { useEntries } from '@/hooks/useEntries';
import { usePrompts } from '@/hooks/usePrompts';
import { useVisitedSet } from '@/hooks/useVisitedSet';
import {
   MAX_AI_RETRIES,
   ROUTE_ENTRY_DETAIL,
   ROUTE_HOME,
} from '@/lib/constants';
import { buildDisputeText } from '@/lib/textUtils';
import type { AbcdeJson } from '@/models/abcdeJson';
import type { LearnedGrowthResponse } from '@/models/aiService';
import { Entry } from '@/models/entry';
import { NewInputDisputeType } from '@/models/newInputEntryType';
import {
   useEntriesAiPending,
   useEntriesRealtime,
   useEntriesSync,
} from '@/providers/EntriesStoreProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import { Alert, Keyboard, Platform, Text, View } from 'react-native';
import {
   AndroidSoftInputModes,
   KeyboardController,
} from 'react-native-keyboard-controller';
import Animated, {
   useAnimatedStyle,
   useSharedValue,
   withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEP_ORDER = [
   'evidence',
   'alternatives',
   'usefulness',
   'energy',
] as const;
const KEEP_AWAKE_TAG = 'abc-analysis';

export default function DisputeScreen() {
   // Manual Control setup
   useEffect(() => {
      if (Platform.OS === 'android') {
         KeyboardController.setInputMode(
            AndroidSoftInputModes.SOFT_INPUT_ADJUST_NOTHING,
         );
      }
      return () => {
         if (Platform.OS === 'android') {
            KeyboardController.setDefaultMode();
         }
      };
   }, []);

   const params = useLocalSearchParams<{
      id?: string | string[];
      view?: string | string[];
      refresh?: string | string[];
      newDispute?: string | string[];
      from?: string | string[];
   }>();

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
   const viewQuery = Array.isArray(params.view) ? params.view[0] : params.view;
   const refreshQuery = Array.isArray(params.refresh)
      ? params.refresh[0]
      : params.refresh;
   const newDisputeQuery = Array.isArray(params.newDispute)
      ? params.newDispute[0]
      : params.newDispute;
   const shouldRegenerate = refreshQuery === 'true';
   const shouldStartFresh =
      newDisputeQuery === 'true' || newDisputeQuery === '1';
   const { hapticsEnabled, hapticsAvailable, triggerHaptic } = usePreferences();

   const { getEntryById, updateEntry } = useEntries();
   const syncEntries = useEntriesSync();
   const subscribeToEntryAi = useEntriesRealtime();
   const { markAiPending, clearAiPending } = useEntriesAiPending();
   const entry = entryId ? getEntryById(entryId) : undefined;
   const { hasVisited, markVisited } = useVisitedSet<NewInputDisputeType>();
   const insets = useSafeAreaInsets();

   const topPadding = insets.top + 12;

   const [idx, setIdx] = useState(0);
   const [form, setForm] = useState<Record<NewInputDisputeType, string>>({
      evidence: entry?.dispute ?? '',
      alternatives: '',
      usefulness: '',
      energy: entry?.energy ?? '',
   });
   const autoFilledRef = useRef<Record<NewInputDisputeType, string | null>>({
      evidence: null,
      alternatives: null,
      usefulness: null,
      energy: null,
   });
   const [isNewDisputeFlow, setIsNewDisputeFlow] = useState(false);
   const resetForm = useCallback(() => {
      setForm({
         evidence: '',
         alternatives: '',
         usefulness: '',
         energy: '',
      });
      setIdx(0);
      setIsNewDisputeFlow(true);
   }, []);

   const [analysisTriggered, setAnalysisTriggered] = useState(false);
   const [isRegenerating, setIsRegenerating] = useState(shouldRegenerate);
   const [isPollingForAi, setIsPollingForAi] = useState(false);
   const [aiTimeoutError, setAiTimeoutError] = useState<string | null>(null);

   const initialViewMode: 'steps' | 'analysis' =
      viewQuery === 'analysis' ? 'analysis' : 'steps';
   const [viewMode, setViewMode] = useState<'steps' | 'analysis'>(
      initialViewMode,
   );
   const [hasAutoOpenedAnalysis, setHasAutoOpenedAnalysis] = useState(false);

   const stepsProgress = useSharedValue(initialViewMode === 'steps' ? 1 : 0);
   const analysisProgress = useSharedValue(
      initialViewMode === 'analysis' ? 1 : 0,
   );

   const { analyze, lastResult, loading, error, ready, streamText, clearError } =
      useAbcAi();

   const isMountedRef = useRef(true);
   const isClosingRef = useRef(false);
   const newDisputeAppliedRef = useRef(false);

   useEffect(() => {
      isMountedRef.current = true;
      return () => {
         isMountedRef.current = false;
      };
   }, []);

   useEffect(() => {
      if (!shouldStartFresh || newDisputeAppliedRef.current) return;
      newDisputeAppliedRef.current = true;
      resetForm();
   }, [resetForm, shouldStartFresh]);

   // AI Trigger Effect
   useEffect(() => {
      if (!entry || !ready) return;
      if (!shouldRegenerate || analysisTriggered || lastResult) return;

      setAnalysisTriggered(true);
      setIsRegenerating(true);
      markAiPending(entry.id);

      (async () => {
         try {
            const result = await analyze({
               entryId: entry.id,
               adversity: entry.adversity,
               belief: entry.belief,
               consequence: entry.consequence ?? undefined,
            });

            if (isMountedRef.current) setIsRegenerating(false);

            const nextRetryCount = (entry.aiRetryCount ?? 0) + 1;
            await updateEntry(entry.id, {
               aiResponse: result.data,
               aiRetryCount: nextRetryCount,
            });
            clearAiPending(entry.id);

            if (isMountedRef.current && hapticsEnabled && hapticsAvailable) {
               triggerHaptic();
            }
         } catch (e) {
            console.log(e);
            if (isMountedRef.current) setIsRegenerating(false);
            clearAiPending(entry.id);
         }
      })();
   }, [
      ready,
      shouldRegenerate,
      analysisTriggered,
      entry,
      lastResult,
      analyze,
      updateEntry,
      hapticsEnabled,
      hapticsAvailable,
      triggerHaptic,
      markAiPending,
      clearAiPending,
   ]);

   const data = rawAbcde as AbcdeJson;
   const promptListGetter = useCallback(
      (key: NewInputDisputeType) => {
         if (key === 'energy') return data.energy;
         return data.dispute?.[key] ?? [];
      },
      [data],
   );
   const prompts = usePrompts(STEP_ORDER, promptListGetter);

   const currKey = STEP_ORDER[idx];

   const trimmedForm = useMemo(
      () => ({
         evidence: form.evidence.trim(),
         alternatives: form.alternatives.trim(),
         usefulness: form.usefulness.trim(),
         energy: form.energy.trim(),
      }),
      [form],
   );

   const effectiveForm = useMemo(() => {
      return {
         evidence:
            autoFilledRef.current.evidence &&
            trimmedForm.evidence === autoFilledRef.current.evidence.trim()
               ? ''
               : trimmedForm.evidence,
         alternatives:
            autoFilledRef.current.alternatives &&
            trimmedForm.alternatives ===
               autoFilledRef.current.alternatives.trim()
               ? ''
               : trimmedForm.alternatives,
         usefulness:
            autoFilledRef.current.usefulness &&
            trimmedForm.usefulness === autoFilledRef.current.usefulness.trim()
               ? ''
               : trimmedForm.usefulness,
         energy: trimmedForm.energy,
      };
   }, [trimmedForm]);

   const isBlankNewDispute = useMemo(
      () => Object.values(effectiveForm).every((value) => !value),
      [effectiveForm],
   );

   const hasUnsavedChanges = useMemo(() => {
      if (isNewDisputeFlow) {
         return !isBlankNewDispute;
      }
      const composedDispute = buildDisputeText(effectiveForm);
      const entryDispute = (entry?.dispute ?? '').trim();
      const entryEnergy = (entry?.energy ?? '').trim();
      return (
         composedDispute !== entryDispute || trimmedForm.energy !== entryEnergy
      );
   }, [
      entry?.dispute,
      entry?.energy,
      isBlankNewDispute,
      isNewDisputeFlow,
      effectiveForm,
      trimmedForm.energy,
   ]);

   const suggestionPrompts = useMemo(() => {
      const pick = (val?: string | null, fallback?: string) =>
         val && val.trim() ? val : (fallback ?? '');
      const sug =
         lastResult?.data?.suggestions ?? entry?.aiResponse?.suggestions;
      return {
         evidence: pick(sug?.evidenceQuestion, prompts.evidence),
         alternatives: pick(sug?.alternativesQuestion, prompts.alternatives),
         usefulness: pick(sug?.usefulnessQuestion, prompts.usefulness),
         energy: prompts.energy,
      } as Record<NewInputDisputeType, string>;
   }, [entry?.aiResponse?.suggestions, lastResult?.data?.suggestions, prompts]);

   const suggestionStarters = useMemo(() => {
      const clean = (val?: string | null) => {
         if (!val || !val.trim()) return null;
         return val.replace(/\.+$/, '').trim() + ' ';
      };

      const sug =
         lastResult?.data?.suggestions ?? entry?.aiResponse?.suggestions;

      return {
         evidence: clean(sug?.evidenceStarter),
         alternatives: clean(sug?.alternativesStarter),
         usefulness: clean(sug?.usefulnessStarter),
      };
   }, [entry?.aiResponse?.suggestions, lastResult?.data?.suggestions]);

   const currentText = trimmedForm[currKey];
   const currentStarter = (suggestionStarters as Record<string, string | null>)[
      currKey
   ];
   const isUnchangedStarter = useMemo(() => {
      if (!currentStarter) return false;
      return currentText === currentStarter.trim();
   }, [currentStarter, currentText]);

   const disableNext = !currentText || isUnchangedStarter;

   useEffect(() => {
      if (!entryId) return;
      if (
         !suggestionStarters.evidence &&
         !suggestionStarters.alternatives &&
         !suggestionStarters.usefulness
      ) {
         return;
      }
      setForm((prev) => ({
         ...prev,
         evidence:
            prev.evidence.trim() || !suggestionStarters.evidence
               ? prev.evidence
               : suggestionStarters.evidence,
         alternatives:
            prev.alternatives.trim() || !suggestionStarters.alternatives
               ? prev.alternatives
               : suggestionStarters.alternatives,
         usefulness:
            prev.usefulness.trim() || !suggestionStarters.usefulness
               ? prev.usefulness
               : suggestionStarters.usefulness,
      }));
      if (suggestionStarters.evidence) {
         autoFilledRef.current.evidence = suggestionStarters.evidence;
      }
      if (suggestionStarters.alternatives) {
         autoFilledRef.current.alternatives = suggestionStarters.alternatives;
      }
      if (suggestionStarters.usefulness) {
         autoFilledRef.current.usefulness = suggestionStarters.usefulness;
      }
   }, [
      entryId,
      suggestionStarters.alternatives,
      suggestionStarters.evidence,
      suggestionStarters.usefulness,
   ]);

   const aiData: LearnedGrowthResponse | null = useMemo(() => {
      if (isRegenerating) return null;
      if (lastResult?.data) return lastResult.data;
      return entry?.aiResponse ?? null;
   }, [entry?.aiResponse, isRegenerating, lastResult?.data]);

   const setField = useCallback(
      (k: NewInputDisputeType) => (v: string) =>
         setForm((f) => ({ ...f, [k]: v })),
      [],
   );

   const submit = useCallback(async () => {
      if (!entry) return;

      const dispute = buildDisputeText(trimmedForm);
      const nextEnergy = trimmedForm.energy;
      const hasExistingDispute = (entry.dispute ?? '').trim().length > 0;
      const disputeChanged = dispute !== (entry.dispute ?? '');
      const energyChanged = nextEnergy !== (entry.energy ?? '');

      const patch: Partial<Entry> = {};
      if (dispute !== (entry.dispute ?? '')) patch.dispute = dispute;
      if (nextEnergy !== (entry.energy ?? '')) patch.energy = nextEnergy;
      if (hasExistingDispute && (disputeChanged || energyChanged)) {
         const history = entry.disputeHistory;
         const historyTimestamp = new Date().toISOString();
         patch.disputeHistory = [
            ...history,
            {
               dispute: entry.dispute ?? '',
               energy: entry.energy ?? null,
               createdAt: historyTimestamp,
            },
         ];
      }

      const hasChanges = Object.keys(patch).length > 0;
      if (hasChanges) {
         void updateEntry(entry.id, patch).catch((e) =>
            console.error('Failed to save dispute', e),
         );
      }

      if (hapticsEnabled && hapticsAvailable) triggerHaptic();

      const targetRoute = {
         pathname: ROUTE_ENTRY_DETAIL,
         params: { id: String(entry.id), animateInstant: '1' },
      } as const;

      router.dismissTo(targetRoute);
   }, [
      entry,
      hapticsAvailable,
      hapticsEnabled,
      triggerHaptic,
      trimmedForm,
      updateEntry,
   ]);

   const handleRefreshAnalysis = useCallback(async () => {
      if (!entry) return;
      if (loading || isRegenerating) return;
      markAiPending(entry.id);
      setIsRegenerating(true);
      try {
         const result = await analyze({
            entryId: entry.id,
            adversity: entry.adversity,
            belief: entry.belief,
            consequence: entry.consequence,
         });

         setIsRegenerating(false);
         const nextRetryCount = (entry.aiRetryCount ?? 0) + 1;

         await updateEntry(entry.id, {
            aiResponse: result.data,
            aiRetryCount: nextRetryCount,
         });
         clearAiPending(entry.id);

         if (hapticsEnabled && hapticsAvailable) triggerHaptic();
      } catch (e) {
         setIsRegenerating(false);
         clearAiPending(entry.id);
         console.error('Refresh failed', e);
      }
   }, [
      entry,
      loading,
      analyze,
      updateEntry,
      hapticsEnabled,
      hapticsAvailable,
      triggerHaptic,
      markAiPending,
      clearAiPending,
      isRegenerating,
   ]);

   useEffect(() => {
      if (!hasAutoOpenedAnalysis && (analysisTriggered || lastResult)) {
         setViewMode('analysis');
         setHasAutoOpenedAnalysis(true);
      }
   }, [analysisTriggered, hasAutoOpenedAnalysis, lastResult]);

   const showAnalysis = viewMode === 'analysis';
   const aiDataReady = Boolean(lastResult?.data || entry?.aiResponse);
   const aiDataReadyRef = useRef(aiDataReady);
   useEffect(() => {
      aiDataReadyRef.current = aiDataReady;
   }, [aiDataReady]);

   const isAwaitingAi =
      showAnalysis && !aiDataReady && (analysisTriggered || isRegenerating || loading);

   useEffect(() => {
      if (!isAwaitingAi || !entryId) {
         setIsPollingForAi(false);
         return;
      }

      let cancelled = false;
      setAiTimeoutError(null);
      setIsPollingForAi(true);

      const unsubscribe = subscribeToEntryAi(entryId, () => {
         if (cancelled) return;
         void syncEntries();
      });

      const safetyInterval = setInterval(() => {
         if (cancelled) return;
         if (!aiDataReadyRef.current) {
            void syncEntries();
         }
      }, 10000);

      const timeoutId = setTimeout(() => {
         if (cancelled) return;
         if (!aiDataReadyRef.current) {
            setIsPollingForAi(false);
            if (entryId) clearAiPending(entryId);
            setAiTimeoutError(
               'AI analysis is taking longer than expected. Please try again.',
            );
         }
      }, 60000);

      return () => {
         cancelled = true;
         clearInterval(safetyInterval);
         clearTimeout(timeoutId);
         unsubscribe();
         setIsPollingForAi(false);
      };
   }, [entryId, isAwaitingAi, subscribeToEntryAi, syncEntries, clearAiPending]);

   useEffect(() => {
      if (!aiDataReady) return;
      clearError();
      setAiTimeoutError(null);
   }, [aiDataReady, clearError]);

   const stepsAnimatedStyle = useAnimatedStyle(() => ({
      opacity: stepsProgress.value,
      transform: [{ translateY: (1 - stepsProgress.value) * 12 }],
   }));

   const analysisAnimatedStyle = useAnimatedStyle(() => ({
      opacity: analysisProgress.value,
      transform: [{ translateY: (1 - analysisProgress.value) * -12 }],
   }));

   useEffect(() => {
      const toSteps = viewMode === 'steps';
      stepsProgress.value = withTiming(toSteps ? 1 : 0, { duration: 220 });
      analysisProgress.value = withTiming(toSteps ? 0 : 1, { duration: 220 });
   }, [analysisProgress, stepsProgress, viewMode]);
   const handleGoToSteps = useCallback(() => {
      if (entry && (entry.dispute ?? '').trim().length > 0) {
         resetForm();
      }
      setViewMode('steps');
   }, [entry, resetForm]);

   useEffect(() => {
      if (showAnalysis) {
         activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
         return () => {
            deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
         };
      }
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
   }, [showAnalysis]);

   const handleClose = useCallback(() => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      const safeGoBack = () => {
         if (router.canGoBack()) {
            router.back();
            return;
         }
         if (entryId) {
            router.replace({
               pathname: ROUTE_ENTRY_DETAIL,
               params: { id: String(entryId), animateInstant: '1' },
            });
            return;
         }
         router.replace(ROUTE_HOME);
      };

      if (!hasUnsavedChanges) {
         safeGoBack();
         return;
      }

      Keyboard.dismiss();
      Alert.alert(
         'Discard changes?',
         'You have unsaved changes. Close without saving?',
         [
            {
               text: 'Cancel',
               style: 'cancel',
               onPress: () => {
                  isClosingRef.current = false;
               },
            },
            {
               text: 'Discard',
               style: 'destructive',
               onPress: safeGoBack,
            },
         ],
      );
   }, [entryId, hasUnsavedChanges]);

   if (!entry) {
      return (
         <View
            className="flex-1 justify-center items-center gap-2"
            style={{ paddingTop: topPadding }}
         >
            <StatusBar
               translucent
               backgroundColor="transparent"
               style={isDark ? 'light' : 'dark'}
            />
            <Text className="text-slate-900 dark:text-slate-100">
               Entry not found.
            </Text>
         </View>
      );
   }

   return (
      <Animated.View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <View className="absolute top-0 left-0 right-0 z-10">
            <TopFade height={topPadding} />
         </View>
         <View className="flex-1 relative">
            {/* 1. Steps Layer (Dispute) */}
            <Animated.View
               pointerEvents={showAnalysis ? 'none' : 'auto'}
               className="absolute inset-0"
               style={stepsAnimatedStyle}
            >
               {/* NOTE: DisputeSteps now manages its own layout/keyboard logic via useSmoothKeyboard.
                  We just pass the data props.
               */}
               <DisputeSteps
                  entry={entry}
                  idx={idx}
                  currKey={currKey}
                  prompts={suggestionPrompts}
                  hasVisited={hasVisited}
                  markVisited={markVisited}
                  form={form}
                  setField={setField}
                  setIdx={setIdx}
                  onSubmit={submit}
                  onExit={handleClose}
                  disableNext={disableNext}
                  contentTopPadding={topPadding}
               />
            </Animated.View>

            {/* 2. Analysis Layer (AI) */}
            <Animated.View
               pointerEvents={showAnalysis ? 'auto' : 'none'}
               className="absolute inset-0 px-5"
               style={analysisAnimatedStyle}
            >
               <ABCAnalysis
                  entry={entry}
                  aiData={aiData}
                  loading={loading || isRegenerating || isPollingForAi}
                  error={aiTimeoutError ?? (isPollingForAi ? null : error)}
                  streamingText={streamText}
                  contentTopPadding={topPadding}
                  onExit={handleClose}
                  onGoToSteps={handleGoToSteps}
                  onRefresh={handleRefreshAnalysis}
                  retryCount={entry?.aiRetryCount ?? 0}
                  maxRetries={MAX_AI_RETRIES}
               />
            </Animated.View>
         </View>
      </Animated.View>
   );
}
