import rawAbcde from '@/assets/data/abcde.json';
import { MAX_AI_RETRIES, ROUTE_ENTRIES } from '@/components/constants';
import ABCAnalysis from '@/components/entries/dispute/ABCAnalysis';
import DisputeSteps from '@/components/entries/dispute/DisputeSteps';
import { useAbcAi } from '@/hooks/useAbcAi';
import { useEntries } from '@/hooks/useEntries';
import { usePromptLayout } from '@/hooks/usePromptLayout';
import { usePrompts } from '@/hooks/usePrompts';
import { useVisitedSet } from '@/hooks/useVisitedSet';
import { buildDisputeText } from '@/lib/textUtils';
import type { AbcdeJson } from '@/models/abcdeJson';
import type { LearnedGrowthResponse } from '@/models/aiService';
import { Entry } from '@/models/entry';
import { NewInputDisputeType } from '@/models/newInputEntryType';
import { usePreferences } from '@/providers/PreferencesProvider';
import {
   activateKeepAwakeAsync,
   deactivateKeepAwake,
} from 'expo-keep-awake';
import {
   router,
   useLocalSearchParams,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import {
   Alert,
   Keyboard,
   NativeScrollEvent,
   NativeSyntheticEvent,
   ScrollView,
   Text,
   TextInput,
   View,
} from 'react-native';
import {
   KeyboardAvoidingView,
   KeyboardEvents,
   useResizeMode,
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
   useResizeMode();
   const params = useLocalSearchParams<{
      id?: string | string[];
      view?: string | string[];
      refresh?: string | string[];
   }>();

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
   const viewQuery = Array.isArray(params.view) ? params.view[0] : params.view;
   const refreshQuery = Array.isArray(params.refresh)
      ? params.refresh[0]
      : params.refresh;
   const shouldRegenerate = refreshQuery === 'true';
   const { hapticsEnabled, hapticsAvailable, triggerHaptic } = usePreferences();

   const { getEntryById, updateEntry } = useEntries();
   const entry = entryId ? getEntryById(entryId) : undefined;
   const { hasVisited, markVisited } = useVisitedSet<NewInputDisputeType>();
   const insets = useSafeAreaInsets();

   // Unified Edge-to-Edge Padding Logic
   const topPadding = insets.top + 12;

   const [idx, setIdx] = useState(0);
   const [form, setForm] = useState<Record<NewInputDisputeType, string>>({
      evidence: entry?.dispute ?? '',
      alternatives: '',
      usefulness: '',
      energy: entry?.energy ?? '',
   });

   const [analysisTriggered, setAnalysisTriggered] = useState(false);
   const [isRegenerating, setIsRegenerating] = useState(shouldRegenerate);

   const initialViewMode: 'steps' | 'analysis' =
      viewQuery === 'analysis' ? 'analysis' : 'steps';
   const [viewMode, setViewMode] = useState<'steps' | 'analysis'>(
      initialViewMode
   );
   const [hasAutoOpenedAnalysis, setHasAutoOpenedAnalysis] = useState(false);

   const stepsProgress = useSharedValue(initialViewMode === 'steps' ? 1 : 0);
   const analysisProgress = useSharedValue(
      initialViewMode === 'analysis' ? 1 : 0
   );

   const { analyze, lastResult, loading, error, ready, streamText } =
      useAbcAi();

   const isMountedRef = useRef(true);
   // --- FIX: ADD REF LOCK ---
   const isClosingRef = useRef(false);

   useEffect(() => {
      isMountedRef.current = true;
      return () => {
         isMountedRef.current = false;
      };
   }, []);

   useEffect(() => {
      // 1. Basic Guards
      if (!entry || !ready) return;

      // 2. Prevent Double-Trigger
      if (!shouldRegenerate || analysisTriggered || lastResult) return;

      setAnalysisTriggered(true);
      setIsRegenerating(true);

      (async () => {
         try {
            // This runs in the background even if screen closes
            const result = await analyze({
               adversity: entry.adversity,
               belief: entry.belief,
               consequence: entry.consequence ?? undefined,
            });

            // UI Update: Guarded (Only if screen is open)
            if (isMountedRef.current) {
               setIsRegenerating(false);
            }

            // Data Save: UNGUARDED (Runs even if screen is closed)
            const nextRetryCount = (entry.aiRetryCount ?? 0) + 1;
            await updateEntry(entry.id, {
               aiResponse: result.data,
               aiRetryCount: nextRetryCount,
            });

            // Haptics: Guarded
            if (isMountedRef.current && hapticsEnabled && hapticsAvailable) {
               triggerHaptic();
            }
         } catch (e) {
            console.log(e);
            if (isMountedRef.current) setIsRegenerating(false);
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
   ]);

   const data = rawAbcde as AbcdeJson;
   const promptListGetter = useCallback(
      (key: NewInputDisputeType) => {
         if (key === 'energy') return data.energy;
         return data.dispute?.[key] ?? [];
      },
      [data]
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
      [form]
   );

   const hasUnsavedChanges = useMemo(() => {
      const composedDispute = buildDisputeText(trimmedForm);
      const entryDispute = (entry?.dispute ?? '').trim();
      const entryEnergy = (entry?.energy ?? '').trim();
      return (
         composedDispute !== entryDispute || trimmedForm.energy !== entryEnergy
      );
   }, [entry?.dispute, entry?.energy, trimmedForm]);

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

   const aiData: LearnedGrowthResponse | null = useMemo(() => {
      if (isRegenerating) return null;
      if (lastResult?.data) return lastResult.data;
      return entry?.aiResponse ?? null;
   }, [entry?.aiResponse, isRegenerating, lastResult?.data]);

   const currentEmpty = !trimmedForm[currKey];
   const scrollRef = useRef<ScrollView | null>(null);
   const stickToBottom = useRef(true);
   const inputRef = useRef<TextInput>(null);
   const {
      promptTextStyle,
      promptTextAnimatedStyle,
      promptTextMeasureStyle,
      promptLineBreakKey,
      promptContainerAnimatedStyle,
      inputBoxDims,
      inputBoxAnimatedStyle,
   } = usePromptLayout('compact');

   const setField = useCallback(
      (k: NewInputDisputeType) => (v: string) =>
         setForm((f) => ({ ...f, [k]: v })),
      []
   );
   
   const submit = useCallback(async () => {
      if (!entry) return;

      const dispute = buildDisputeText(trimmedForm);
      const nextEnergy = trimmedForm.energy;

      const patch: Partial<Entry> = {};
      if (dispute !== (entry.dispute ?? '')) patch.dispute = dispute;
      if (nextEnergy !== (entry.energy ?? '')) patch.energy = nextEnergy;

      const hasChanges = Object.keys(patch).length > 0;
      if (hasChanges) {
         void updateEntry(entry.id, patch).catch((e) =>
            console.error('Failed to save dispute', e)
         );
      }

      if (hapticsEnabled && hapticsAvailable) triggerHaptic();

      const targetRoute = {
         pathname: '/entries/[id]',
         params: { id: String(entry.id), animateInstant: '1' },
      } as const;

      if (router.canGoBack()) {
         router.back();
         return;
      }

      router.replace(targetRoute);
   }, [
      entry,
      hapticsAvailable,
      hapticsEnabled,
      triggerHaptic,
      trimmedForm,
      updateEntry,
   ]);

   const scrollToBottom = useCallback((animated = true) => {
      const ref = scrollRef.current;
      if (!ref) return;
      ref.scrollToEnd({ animated });
   }, []);

   const handleScroll = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
         const { layoutMeasurement, contentOffset, contentSize } =
            e.nativeEvent;
         const gap =
            contentSize.height - (contentOffset.y + layoutMeasurement.height);
         stickToBottom.current = gap < 12;
      },
      []
   );

   const handleRefreshAnalysis = useCallback(async () => {
      if (!entry) return;
      setIsRegenerating(true);
      try {
         const result = await analyze({
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

         if (hapticsEnabled && hapticsAvailable) triggerHaptic();
      } catch (e) {
         setIsRegenerating(false);
         console.error('Refresh failed', e);
      }
   }, [
      entry,
      analyze,
      updateEntry,
      hapticsEnabled,
      hapticsAvailable,
      triggerHaptic,
   ]);

   useEffect(() => {
      requestAnimationFrame(() => scrollToBottom(false));
   }, [scrollToBottom]);

   useEffect(() => {
      const handleShow = () => requestAnimationFrame(() => scrollToBottom(true));
      const didShowSub = KeyboardEvents.addListener('keyboardDidShow', handleShow);
      return () => {
         didShowSub.remove();
      };
   }, [scrollToBottom]);

   useEffect(() => {
      if (!hasAutoOpenedAnalysis && (analysisTriggered || lastResult)) {
         setViewMode('analysis');
         setHasAutoOpenedAnalysis(true);
      }
   }, [analysisTriggered, hasAutoOpenedAnalysis, lastResult]);

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

   const showAnalysis = viewMode === 'analysis';
   useEffect(() => {
      if (showAnalysis) {
         activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
         return () => {
            deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
         };
      }
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
   }, [showAnalysis]);

   // --- FIX: SAFE HANDLE CLOSE ---
   const handleClose = useCallback(() => {
      // 1. Idempotency Check
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      const safeGoBack = () => {
         if (router.canGoBack()) {
            router.back();
         } else {
            router.replace(ROUTE_ENTRIES);
         }
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
                  // Unlock if cancelled
                  isClosingRef.current = false;
               }
            },
            {
               text: 'Discard',
               style: 'destructive',
               onPress: safeGoBack, // Lock remains active here
            },
         ]
      );
   }, [hasUnsavedChanges]);

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
      <>
         <KeyboardAvoidingView
            className="flex-1 bg-slate-50 dark:bg-slate-900"
            behavior={'padding'}
         >
            <View className="flex-1 relative">
               {/* 1. Steps Layer (Dispute) */}
               <Animated.View
                  pointerEvents={showAnalysis ? 'none' : 'auto'}
                  className="absolute inset-0 px-5"
                  style={stepsAnimatedStyle}
               >
                  <DisputeSteps
                     entry={entry}
                     idx={idx}
                     currKey={currKey}
                     prompts={suggestionPrompts}
                     promptTextStyle={promptTextStyle}
                     promptTextAnimatedStyle={promptTextAnimatedStyle}
                     promptTextMeasureStyle={promptTextMeasureStyle}
                     promptLineBreakKey={promptLineBreakKey}
                     promptContainerAnimatedStyle={promptContainerAnimatedStyle}
                     hasVisited={hasVisited}
                     markVisited={markVisited}
                     form={form}
                     setField={setField}
                     setIdx={setIdx}
                     onSubmit={submit}
                     onExit={handleClose} // Use safe close here too
                     disableNext={currentEmpty}
                     hasUnsavedChanges={hasUnsavedChanges}
                     scrollRef={scrollRef}
                     handleScroll={handleScroll}
                     scrollToBottom={scrollToBottom}
                     inputRef={inputRef}
                     inputBoxDims={inputBoxDims}
                     inputBoxAnimatedStyle={inputBoxAnimatedStyle}
                     promptContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'space-evenly',
                     }}
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
                     loading={loading}
                     error={error}
                     streamingText={streamText}
                     contentTopPadding={topPadding}
                     onExit={handleClose} // Safe close with lock
                     onGoToSteps={() => setViewMode('steps')}
                     onRefresh={handleRefreshAnalysis}
                     retryCount={entry?.aiRetryCount ?? 0}
                     maxRetries={MAX_AI_RETRIES}
                  />
               </Animated.View>
            </View>
         </KeyboardAvoidingView>
      </>
   );
}
