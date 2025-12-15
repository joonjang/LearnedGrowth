import rawAbcde from '@/assets/data/abcde.json';
import ABCAnalysis from '@/components/entries/dispute/ABCAnalysis';
import DisputeSteps from '@/components/entries/dispute/DisputeSteps';
import { useAbcAi } from '@/hooks/useAbcAi';
import { useEntries } from '@/hooks/useEntries';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { usePromptLayout } from '@/hooks/usePromptLayout';
import { usePrompts } from '@/hooks/usePrompts';
import { useVisitedSet } from '@/hooks/useVisitedSet';
import type { AbcdeJson } from '@/models/abcdeJson';
import type { LearnedGrowthResponse } from '@/models/aiService';
import { Entry } from '@/models/entry';
import { NewInputDisputeType } from '@/models/newInputEntryType';
import { usePreferences } from '@/providers/PreferencesProvider';
// REMOVED: import { useTheme } from '@/theme/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind'; // <--- Added
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
   View
} from 'react-native';
import { KeyboardAvoidingView, KeyboardEvents } from 'react-native-keyboard-controller';
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

function endWithPeriod(text: string) {
   const trimmed = text.trim();
   if (!trimmed) return '';
   const lastChar = trimmed.slice(-1);
   return ['.', '!', '?'].includes(lastChar) ? trimmed : `${trimmed}.`;
}

function buildDisputeText(form: Record<NewInputDisputeType, string>) {
   const sentences = [
      endWithPeriod(form.evidence ?? ''),
      endWithPeriod(form.alternatives ?? ''),
      endWithPeriod(form.usefulness ?? ''),
   ].filter(Boolean);

   return sentences.join(' ');
}

export default function DisputeScreen() {
   const params = useLocalSearchParams<{
      id?: string | string[];
      analyze?: string | string[];
   }>();

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
   const analyzeQuery = Array.isArray(params.analyze)
      ? params.analyze[0]
      : params.analyze;
   const shouldAnalyze = analyzeQuery === '1' || analyzeQuery === 'true';
   const {
      showAiAnalysis: aiVisible,
      hapticsEnabled,
      hapticsAvailable,
      triggerHaptic,
   } = usePreferences();

   const allowAnalysis = aiVisible;

   const { getEntryById, updateEntry } = useEntries();
   const entry = entryId ? getEntryById(entryId) : undefined;
   const { hasVisited, markVisited } = useVisitedSet<NewInputDisputeType>();
   const insets = useSafeAreaInsets();
   const isKeyboardVisible = useKeyboardVisible();


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

   const initialViewMode: 'steps' | 'analysis' =
      allowAnalysis && shouldAnalyze ? 'analysis' : 'steps';
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

   useEffect(() => {
      if (!entry || !ready || !allowAnalysis) return;
      if (!shouldAnalyze || analysisTriggered || lastResult) return;
      if (entry?.aiResponse) return;

      setAnalysisTriggered(true);
      analyze({
         adversity: entry.adversity,
         belief: entry.belief,
         consequence: entry.consequence ?? undefined,
      }).catch((e) => console.log(e));
   }, [
      allowAnalysis,
      ready,
      shouldAnalyze,
      analysisTriggered,
      entry,
      lastResult,
      analyze,
   ]);

   useEffect(() => {
      if (!allowAnalysis && viewMode === 'analysis') {
         setViewMode('steps');
      }
   }, [allowAnalysis, viewMode]);

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

   useEffect(() => {
      if (!entry || !lastResult?.data) return;
      const storedKey = entry.aiResponse
         ? JSON.stringify(entry.aiResponse)
         : null;
      const incomingKey = JSON.stringify(lastResult.data);
      if (storedKey === incomingKey) return;
      updateEntry(entry.id, { aiResponse: lastResult.data }).catch((e) =>
         console.warn('Failed to store AI response', e)
      );
   }, [entry, lastResult?.data, updateEntry]);

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
      if (lastResult?.data) return lastResult.data;
      return entry?.aiResponse ?? null;
   }, [entry?.aiResponse, lastResult?.data]);

   const currentEmpty = !trimmedForm[currKey];
   const scrollRef = useRef<ScrollView | null>(null);
   const stickToBottom = useRef(true);
   const inputRef = useRef<TextInput>(null);
   const { promptTextStyle, inputBoxDims, promptMaxHeight } =
      usePromptLayout('compact');

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
      if (Object.keys(patch).length) await updateEntry(entry.id, patch);
      if (hapticsEnabled && hapticsAvailable) triggerHaptic();
      router.back();
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

   useEffect(() => {
      requestAnimationFrame(() => scrollToBottom(false));
   }, [scrollToBottom]);

   useEffect(() => {
      const handleShow = () =>
         requestAnimationFrame(() => scrollToBottom(true));
      const willShowSub = KeyboardEvents.addListener(
         'keyboardWillShow',
         handleShow
      );
      const didShowSub = KeyboardEvents.addListener(
         'keyboardDidShow',
         handleShow
      );
      return () => {
         willShowSub.remove();
         didShowSub.remove();
      };
   }, [scrollToBottom]);

   useEffect(() => {
      if (!allowAnalysis) return;
      if (!hasAutoOpenedAnalysis && (analysisTriggered || lastResult)) {
         setViewMode('analysis');
         setHasAutoOpenedAnalysis(true);
      }
   }, [allowAnalysis, analysisTriggered, hasAutoOpenedAnalysis, lastResult]);

   const stepsAnimatedStyle = useAnimatedStyle(() => ({
      opacity: stepsProgress.value,
      transform: [{ translateY: (1 - stepsProgress.value) * 12 }],
   }));

   const analysisAnimatedStyle = useAnimatedStyle(() => ({
      opacity: analysisProgress.value,
      transform: [{ translateY: (1 - analysisProgress.value) * -12 }],
   }));

   useEffect(() => {
      if (!allowAnalysis) {
         stepsProgress.value = 1;
         analysisProgress.value = 0;
         return;
      }
      const toSteps = viewMode === 'steps';
      stepsProgress.value = withTiming(toSteps ? 1 : 0, { duration: 220 });
      analysisProgress.value = withTiming(toSteps ? 0 : 1, { duration: 220 });
   }, [allowAnalysis, analysisProgress, stepsProgress, viewMode]);

   const showAnalysis = allowAnalysis && viewMode === 'analysis';
   const handleClose = useCallback(() => {
      if (!hasUnsavedChanges) {
         router.back();
         return;
      }
      Keyboard.dismiss();
      Alert.alert(
         'Discard changes?',
         'You have unsaved changes. Close without saving?',
         [
            { text: 'Cancel', style: 'cancel' },
            {
               text: 'Discard',
               style: 'destructive',
               onPress: () => router.back(),
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
            <Text className="text-slate-900 dark:text-slate-100">Entry not found.</Text>
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
                     promptMaxHeight={promptMaxHeight}
                     hasVisited={hasVisited}
                     markVisited={markVisited}
                     form={form}
                     setField={setField}
                     setIdx={setIdx}
                     onSubmit={submit}
                     onExit={() => router.back()}
                     disableNext={currentEmpty}
                     hasUnsavedChanges={hasUnsavedChanges}
                     scrollRef={scrollRef}
                     handleScroll={handleScroll}
                     scrollToBottom={scrollToBottom}
                     inputRef={inputRef}
                     isKeyboardVisible={isKeyboardVisible}
                     inputBoxDims={inputBoxDims}
                     // Pass a simple style object if component expects style, or className if it supports it.
                     // Assuming 'promptContainerStyle' is a legacy style prop in the child:
                     promptContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'space-evenly',
                     }}
                     // onShowInsights={() => setViewMode('analysis')}
                     contentTopPadding={topPadding}
                  />
               </Animated.View>

               {/* 2. Analysis Layer (AI) */}
               {allowAnalysis ? (
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
                        onExit={handleClose}
                        onGoToSteps={() => setViewMode('steps')}
                     />
                  </Animated.View>
               ) : null}
            </View>
         </KeyboardAvoidingView>
         
      </>
   );
}
