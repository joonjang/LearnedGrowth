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
import {
   KeyboardAvoidingView,
   KeyboardEvents,
} from 'react-native-keyboard-controller';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';
import { useAbcAi } from '@/features/hooks/useAbcAi';
import DisputeSteps from '@/components/entries/DisputeSteps';
import ABCAnalysis from '@/components/entries/ABCAnalysis';
import { HighlightMap, buildHighlightMap } from '@/components/entries/highlightUtils';

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
   const { id, analyze: analyzeParam } = useLocalSearchParams<{
      id?: string | string[];
      analyze?: string | string[];
   }>();

   const entryId = Array.isArray(id) ? id[0] : id;
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
   const [showPermanenceHighlight, setShowPermanenceHighlight] = useState(false);
   const [showPervasivenessHighlight, setShowPervasivenessHighlight] =
      useState(false);
   const [showPersonalizationHighlight, setShowPersonalizationHighlight] =
      useState(false);
   const [viewMode, setViewMode] = useState<'steps' | 'analysis'>('steps');
   const [hasAutoOpenedAnalysis, setHasAutoOpenedAnalysis] = useState(false);
   const stepsProgress = useSharedValue(1);
   const analysisProgress = useSharedValue(0);

   const { analyze, lastResult, loading, error, ready, streamText } =
      useAbcAi();

   useEffect(() => {
      if (!entry || !ready) return;
      const shouldAnalyze = analyzeParam === '1' || analyzeParam === 'true';
      if (!shouldAnalyze || analysisTriggered || lastResult) return;
      setAnalysisTriggered(true);
      analyze({
         adversity: entry.adversity,
         belief: entry.belief,
         consequence: entry.consequence ?? undefined,
      }).catch((e) => console.log(e)); // optionally reset or surface error
   }, [ready, analyzeParam, analysisTriggered, entry, lastResult, analyze]);

   // dispute should have all empty fields, return if either are filled or if entry doesnt exist
   useEffect(() => {
      if (!entry) return;
      if (entry.dispute || entry.energy) return;
   }, [entry]);

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
      () => lastResult?.data?.analysis ?? entry?.analysis ?? null,
      [entry?.analysis, lastResult?.data?.analysis]
   );

   useEffect(() => {
      if (!entry || !lastResult?.data?.analysis) return;

      const storedKey = entry.analysis
         ? JSON.stringify(entry.analysis)
         : null;
      const incomingKey = JSON.stringify(lastResult.data.analysis);
      if (storedKey === incomingKey) return;

      updateEntry(entry.id, { analysis: lastResult.data.analysis }).catch(
         (e) => console.warn('Failed to store analysis', e)
      );
   }, [entry, lastResult?.data?.analysis, updateEntry]);

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
      const sug = lastResult?.data?.suggestions;
      return {
         evidence: sug?.evidenceQuestion ?? prompts.evidence,
         alternatives: sug?.alternativesQuestion ?? prompts.alternatives,
         usefulness: sug?.usefulnessQuestion ?? prompts.usefulness,
         energy: prompts.energy,
      } as Record<NewInputDisputeType, string>;
   }, [lastResult?.data?.suggestions, prompts]);

   const aiData: LearnedGrowthResponse | null = useMemo(() => {
      if (lastResult?.data) return lastResult.data;
      if (!entry?.analysis) return null;
      return {
         analysis: entry.analysis,
         safety: { isCrisis: false, crisisMessage: null },
         suggestions: {
            evidenceQuestion: null,
            alternativesQuestion: null,
            usefulnessQuestion: null,
            counterBelief: null,
         },
      };
   }, [entry?.analysis, lastResult?.data]);

   const handleDimensionPressIn = useCallback(
      (field: 'permanence' | 'pervasiveness' | 'personalization') => {
         setShowPermanenceHighlight(field === 'permanence');
         setShowPervasivenessHighlight(field === 'pervasiveness');
         setShowPersonalizationHighlight(field === 'personalization');
      },
      []
   );

   const handleDimensionPressOut = useCallback(() => {
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
      router.back();
   }, [entry, trimmedForm, updateEntry]);

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
      if (!hasAutoOpenedAnalysis && (analysisTriggered || lastResult)) {
         setViewMode('analysis');
         setHasAutoOpenedAnalysis(true);
      }
   }, [analysisTriggered, hasAutoOpenedAnalysis, lastResult]);

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
      const toSteps = viewMode === 'steps';
      stepsProgress.value = withTiming(toSteps ? 1 : 0, { duration: 220 });
      analysisProgress.value = withTiming(toSteps ? 0 : 1, { duration: 220 });
   }, [analysisProgress, stepsProgress, viewMode]);

   const showAnalysis = viewMode === 'analysis';


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
                  insetsPadding={insets.bottom + 24}
                  promptContainerStyle={styles.promptContainer}
                  contextBoxStyle={styles.contextBox}
                  onShowInsights={() => setViewMode('analysis')}
               />
            </Animated.View>

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
                  onPressOut={handleDimensionPressOut}
               />
            </Animated.View>
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
   scroll: { flex: 1 },
   scrollContent: {
      flexGrow: 1,
      justifyContent: 'space-between',
      gap: 16,
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
      position: 'absolute'
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
