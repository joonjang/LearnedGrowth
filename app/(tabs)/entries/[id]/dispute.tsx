// DisputeScreen.tsx

import rawAbcde from '@/assets/data/abcde.json';
import { usePrompts } from '@/features/hooks/usePrompts';
import { useVisitedSet } from '@/features/hooks/useVisitedSet';
import { useEntries } from '@/features/hooks/useEntries';
import { usePromptLayout } from '@/features/hooks/usePromptLayout';
import { Entry } from '@/models/entry';
import type { LearnedGrowthResponse } from '@/models/aiService';
import type { AbcdeJson } from '@/models/abcdeJson';
import { NewInputDisputeType } from '@/models/newInputEntryType';
import { router, useLocalSearchParams } from 'expo-router';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import {
   KeyboardAvoidingView,
   NativeScrollEvent,
   NativeSyntheticEvent,
   ScrollView,
   StyleSheet,
   Text,
   TextInput,
   View,
} from 'react-native';
import Animated, {
   useAnimatedStyle,
   useSharedValue,
   withTiming,
} from 'react-native-reanimated';
import {
   SafeAreaView,
   useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { KeyboardEvents } from 'react-native-keyboard-controller';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';
import { useAbcAi } from '@/features/hooks/useAbcAi';
import DisputeSteps from '@/components/entries/dispute/DisputeSteps';
import ABCAnalysis from '@/components/entries/dispute/ABCAnalysis';
import {
   HighlightMap,
   buildHighlightMap,
} from '@/components/entries/highlightUtils';
import { usePreferences } from '@/providers/PreferencesProvider';

const STEP_ORDER = [
   'evidence',
   'alternatives',
   'usefulness',
   'energy',
] as const;

const DIMENSION_COLORS = {
   permanence: '#FCA5A5', // stronger rose
   pervasiveness: '#93C5FD', // stronger blue
   personalization: '#C4B5FD', // stronger violet
};

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

   const [idx, setIdx] = useState(0);
   const [form, setForm] = useState<Record<NewInputDisputeType, string>>({
      evidence: entry?.dispute ?? '',
      alternatives: '',
      usefulness: '',
      energy: entry?.energy ?? '',
   });

   const [analysisTriggered, setAnalysisTriggered] = useState(false);

   const [showPermanenceHighlight, setShowPermanenceHighlight] =
      useState(false);
   const [showPervasivenessHighlight, setShowPervasivenessHighlight] =
      useState(false);
   const [showPersonalizationHighlight, setShowPersonalizationHighlight] =
      useState(false);

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
      if (!entry) return;
      if (entry.dispute || entry.energy) return;
   }, [entry]);

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

   const analysisData = useMemo(
      () => lastResult?.data?.analysis ?? entry?.aiResponse?.analysis ?? null,
      [entry?.aiResponse?.analysis, lastResult?.data?.analysis]
   );

   useEffect(() => {
      if (!entry || !lastResult?.data) return;

      const storedKey = entry.aiResponse
         ? JSON.stringify(entry.aiResponse)
         : null;
      const incomingKey = JSON.stringify(lastResult.data);

      if (storedKey === incomingKey) return;

      updateEntry(entry.id, {
         aiResponse: lastResult.data,
      }).catch((e) => console.warn('Failed to store AI response', e));
   }, [entry, lastResult?.data, updateEntry]);

   const permanenceHighlights = useMemo<HighlightMap>(
      () =>
         buildHighlightMap(
            entry,
            analysisData?.dimensions?.permanence?.detectedPhrase,
            DIMENSION_COLORS.permanence
         ),
      [entry, analysisData?.dimensions?.permanence?.detectedPhrase]
   );

   const pervasivenessHighlights = useMemo<HighlightMap>(
      () =>
         buildHighlightMap(
            entry,
            analysisData?.dimensions?.pervasiveness?.detectedPhrase,
            DIMENSION_COLORS.pervasiveness
         ),
      [entry, analysisData?.dimensions?.pervasiveness?.detectedPhrase]
   );

   const personalizationHighlights = useMemo<HighlightMap>(
      () =>
         buildHighlightMap(
            entry,
            analysisData?.dimensions?.personalization?.detectedPhrase,
            DIMENSION_COLORS.personalization
         ),
      [entry, analysisData?.dimensions?.personalization?.detectedPhrase]
   );

   const highlightSets = useMemo(
      () => ({
         permanence: permanenceHighlights,
         pervasiveness: pervasivenessHighlights,
         personalization: personalizationHighlights,
      }),
      [permanenceHighlights, pervasivenessHighlights, personalizationHighlights]
   );

   const suggestionPrompts = useMemo(() => {
      const pick = (val?: string | null, fallback?: string) =>
         val && val.trim() ? val : fallback ?? '';
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

   // Turn highlight ON when user starts pressing
   const handleDimensionPressIn = useCallback(
      (field: 'permanence' | 'pervasiveness' | 'personalization') => {
         setShowPermanenceHighlight(field === 'permanence');
         setShowPervasivenessHighlight(field === 'pervasiveness');
         setShowPersonalizationHighlight(field === 'personalization');
      },
      []
   );

   // Turn highlight OFF (used by tap release OR scroll end)
   const clearDimensionHighlight = useCallback(() => {
      setShowPermanenceHighlight(false);
      setShowPervasivenessHighlight(false);
      setShowPersonalizationHighlight(false);
   }, []);

   const currentEmpty = !trimmedForm[currKey];

   const scrollRef = useRef<ScrollView | null>(null);
   const stickToBottom = useRef(true);
   const inputRef = useRef<TextInput>(null);
   const { promptTextStyle, inputBoxDims, promptMaxHeight } =
      usePromptLayout('compact');

   const setField = useCallback(
      (k: NewInputDisputeType) => (v: string) =>
         setForm((f) => ({
            ...f,
            [k]: v,
         })),
      []
   );

   const submit = useCallback(async () => {
      if (!entry) return;

      const dispute = buildDisputeText(trimmedForm);
      const nextEnergy = trimmedForm.energy;

      const patch: Partial<Entry> = {};
      if (dispute !== (entry.dispute ?? '')) patch.dispute = dispute;
      if (nextEnergy !== (entry.energy ?? '')) patch.energy = nextEnergy;

      if (Object.keys(patch).length) {
         await updateEntry(entry.id, patch);
      }
      if (hapticsEnabled && hapticsAvailable) {
         triggerHaptic();
      }
      router.back();
   }, [entry, hapticsAvailable, hapticsEnabled, triggerHaptic, trimmedForm, updateEntry]);

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
      transform: [
         {
            translateY: (1 - stepsProgress.value) * 12,
         },
      ],
   }));

   const analysisAnimatedStyle = useAnimatedStyle(() => ({
      opacity: analysisProgress.value,
      transform: [
         {
            translateY: (1 - analysisProgress.value) * -12,
         },
      ],
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

   if (!entry) {
      return (
         <SafeAreaView style={styles.centered}>
            <Text>Entry not found.</Text>
         </SafeAreaView>
      );
   }

   return (
      <KeyboardAvoidingView
         style={styles.root}
         behavior={'padding'}
         keyboardVerticalOffset={insets.bottom + 24}
      >
         <View style={styles.page}>
            <Animated.View
               pointerEvents={showAnalysis ? 'none' : 'auto'}
               style={[styles.layer, stepsAnimatedStyle]}
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
                  promptContainerStyle={styles.promptContainer}
                  onShowInsights={() => setViewMode('analysis')}
               />
            </Animated.View>

            {allowAnalysis ? (
               <Animated.View
                  pointerEvents={showAnalysis ? 'auto' : 'none'}
                  style={[styles.layer, analysisAnimatedStyle]}
               >
                  <ABCAnalysis
                     entry={entry}
                     highlights={highlightSets}
                     highlightColors={DIMENSION_COLORS}
                     showPermanenceHighlight={showPermanenceHighlight}
                     showPervasivenessHighlight={showPervasivenessHighlight}
                     showPersonalizationHighlight={showPersonalizationHighlight}
                     aiData={aiData}
                     loading={loading}
                     error={error}
                     streamingText={streamText}
                     onGoToSteps={() => setViewMode('steps')}
                     onPressIn={handleDimensionPressIn}
                     onPressOut={clearDimensionHighlight}
                  />
               </Animated.View>
            ) : null}
         </View>
      </KeyboardAvoidingView>
   );
}

export const styles = StyleSheet.create({
   root: { flex: 1, backgroundColor: '#fff' },

   page: {
      flex: 1,
      position: 'relative',
   },

   promptContainer: {
      flexGrow: 1,
      justifyContent: 'space-evenly',
   },

   inputWrapper: {
      paddingHorizontal: 16,
   },

   centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
   },
   topRow: {
      paddingHorizontal: 4,
      paddingTop: 12,
      paddingBottom: 4,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      position: 'absolute',
   },
   switchButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#cbd5e1',
      backgroundColor: '#f8fafc',
   },
   switchButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#334155',
   },
   container: {
      paddingHorizontal: 20,
      paddingVertical: 8,
   },
   text: { fontSize: 16, fontWeight: '500' },

   contextBox: {
      backgroundColor: '#F3F4F6',
      padding: 12,
      borderRadius: 12,
      gap: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#E5E7EB',
   },
   contextRow: { gap: 4 },
   contextLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#374151',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
   },
   contextText: { fontSize: 14, color: '#111827' },
   highlight: {
      backgroundColor: '#FACC15',
      borderColor: '#D97706',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 4,
      paddingHorizontal: 2,
   },
   layer: {
      ...StyleSheet.absoluteFillObject,
      paddingHorizontal: 20,
   },
   contextDivider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginVertical: 2,
   },

   card: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: '#f5f5f7',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#e5e7eb',
      gap: 4,
   },
   cardPressed: {
      transform: [{ scale: 0.97 }, { translateY: 1 }],
   },
});
