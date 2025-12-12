import rawAbcde from '@/assets/data/abcde.json';
import ABCAnalysis from '@/components/entries/dispute/ABCAnalysis';
import DisputeSteps from '@/components/entries/dispute/DisputeSteps';
import {
   buildHighlightMap
} from '@/components/entries/highlightUtils';
import { useAbcAi } from '@/features/hooks/useAbcAi';
import { useEntries } from '@/features/hooks/useEntries';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';
import { usePromptLayout } from '@/features/hooks/usePromptLayout';
import { usePrompts } from '@/features/hooks/usePrompts';
import { useVisitedSet } from '@/features/hooks/useVisitedSet';
import type { AbcdeJson } from '@/models/abcdeJson';
import type { LearnedGrowthResponse } from '@/models/aiService';
import { Entry } from '@/models/entry';
import { NewInputDisputeType } from '@/models/newInputEntryType';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useTheme } from '@/theme/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import {
   Alert,
   Dimensions, // <--- Added
   Keyboard,
   KeyboardAvoidingView,
   NativeScrollEvent,
   NativeSyntheticEvent,
   Platform, // <--- Added
   ScrollView,
   StyleSheet,
   Text,
   TextInput,
   View,
} from 'react-native';
import { KeyboardEvents } from 'react-native-keyboard-controller';
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

const DIMENSION_COLORS = {
   permanence: '#FCA5A5',
   pervasiveness: '#93C5FD',
   personalization: '#C4B5FD',
};

// 1. Helper for robust bottom padding (Same as NewEntryModal)
const isIphoneWithNotch = () => {
   const dim = Dimensions.get('window');
   return (
      Platform.OS === 'ios' &&
      !Platform.isPad &&
      !Platform.isTV &&
      (dim.height >= 780 || dim.width >= 780)
   );
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
   const { colors, mode } = useTheme();
   const allowAnalysis = aiVisible;

   const { getEntryById, updateEntry } = useEntries();
   const entry = entryId ? getEntryById(entryId) : undefined;
   const { hasVisited, markVisited } = useVisitedSet<NewInputDisputeType>();
   const insets = useSafeAreaInsets();
   const isKeyboardVisible = useKeyboardVisible();
   
   // 2. Updated Padding Logic to match NewEntryModal
   const topPadding = Platform.OS === 'android' ? insets.top + 12 : 20;

   const [idx, setIdx] = useState(0);
   const [form, setForm] = useState<Record<NewInputDisputeType, string>>({
      evidence: entry?.dispute ?? '',
      alternatives: '',
      usefulness: '',
      energy: entry?.energy ?? '',
   });

   const [analysisTriggered, setAnalysisTriggered] = useState(false);
   const [showPermanenceHighlight, setShowPermanenceHighlight] = useState(false);
   const [showPervasivenessHighlight, setShowPervasivenessHighlight] = useState(false);
   const [showPersonalizationHighlight, setShowPersonalizationHighlight] = useState(false);

   const initialViewMode: 'steps' | 'analysis' =
      allowAnalysis && shouldAnalyze ? 'analysis' : 'steps';
   const [viewMode, setViewMode] = useState<'steps' | 'analysis'>(initialViewMode);
   const [hasAutoOpenedAnalysis, setHasAutoOpenedAnalysis] = useState(false);
   
   const stepsProgress = useSharedValue(initialViewMode === 'steps' ? 1 : 0);
   const analysisProgress = useSharedValue(initialViewMode === 'analysis' ? 1 : 0);

   const { analyze, lastResult, loading, error, ready, streamText } = useAbcAi();

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
   }, [allowAnalysis, ready, shouldAnalyze, analysisTriggered, entry, lastResult, analyze]);

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
      return composedDispute !== entryDispute || trimmedForm.energy !== entryEnergy;
   }, [entry?.dispute, entry?.energy, trimmedForm]);

   const analysisData = useMemo(
      () => lastResult?.data?.analysis ?? entry?.aiResponse?.analysis ?? null,
      [entry?.aiResponse?.analysis, lastResult?.data?.analysis]
   );

   useEffect(() => {
      if (!entry || !lastResult?.data) return;
      const storedKey = entry.aiResponse ? JSON.stringify(entry.aiResponse) : null;
      const incomingKey = JSON.stringify(lastResult.data);
      if (storedKey === incomingKey) return;
      updateEntry(entry.id, { aiResponse: lastResult.data })
         .catch((e) => console.warn('Failed to store AI response', e));
   }, [entry, lastResult?.data, updateEntry]);

   const highlightSets = useMemo(() => ({
      permanence: buildHighlightMap(entry, analysisData?.dimensions?.permanence?.detectedPhrase, DIMENSION_COLORS.permanence),
      pervasiveness: buildHighlightMap(entry, analysisData?.dimensions?.pervasiveness?.detectedPhrase, DIMENSION_COLORS.pervasiveness),
      personalization: buildHighlightMap(entry, analysisData?.dimensions?.personalization?.detectedPhrase, DIMENSION_COLORS.personalization),
   }), [entry, analysisData]);

   const suggestionPrompts = useMemo(() => {
      const pick = (val?: string | null, fallback?: string) => val && val.trim() ? val : fallback ?? '';
      const sug = lastResult?.data?.suggestions ?? entry?.aiResponse?.suggestions;
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

   const handleDimensionPressIn = useCallback((field: 'permanence' | 'pervasiveness' | 'personalization') => {
      setShowPermanenceHighlight(field === 'permanence');
      setShowPervasivenessHighlight(field === 'pervasiveness');
      setShowPersonalizationHighlight(field === 'personalization');
   }, []);

   const clearDimensionHighlight = useCallback(() => {
      setShowPermanenceHighlight(false);
      setShowPervasivenessHighlight(false);
      setShowPersonalizationHighlight(false);
   }, []);

   const currentEmpty = !trimmedForm[currKey];
   const scrollRef = useRef<ScrollView | null>(null);
   const stickToBottom = useRef(true);
   const inputRef = useRef<TextInput>(null);
   const { promptTextStyle, inputBoxDims, promptMaxHeight } = usePromptLayout('compact');

   const setField = useCallback(
      (k: NewInputDisputeType) => (v: string) => setForm((f) => ({ ...f, [k]: v })),
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
   }, [entry, hapticsAvailable, hapticsEnabled, triggerHaptic, trimmedForm, updateEntry]);

   const scrollToBottom = useCallback((animated = true) => {
      const ref = scrollRef.current;
      if (!ref) return;
      ref.scrollToEnd({ animated });
   }, []);

   const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const gap = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      stickToBottom.current = gap < 12;
   }, []);

   useEffect(() => { requestAnimationFrame(() => scrollToBottom(false)); }, [scrollToBottom]);

   useEffect(() => {
      const handleShow = () => requestAnimationFrame(() => scrollToBottom(true));
      const willShowSub = KeyboardEvents.addListener('keyboardWillShow', handleShow);
      const didShowSub = KeyboardEvents.addListener('keyboardDidShow', handleShow);
      return () => { willShowSub.remove(); didShowSub.remove(); };
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
            { text: 'Discard', style: 'destructive', onPress: () => router.back() },
         ]
      );
   }, [hasUnsavedChanges, router]);

   if (!entry) {
      return (
         <View style={[styles.centered, { paddingTop: topPadding }]}>
            <StatusBar translucent backgroundColor="transparent" style={mode === 'dark' ? 'light' : 'dark'} />
            <Text>Entry not found.</Text>
         </View>
      );
   }

   return (
      <>
         <StatusBar
            translucent
            backgroundColor="transparent"
            style={mode === 'dark' ? 'light' : 'dark'}
         />
         <KeyboardAvoidingView
            style={styles.root}
            behavior={'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
         >
            <View style={styles.page}>
               
               {/* --- FLOATING CLOSE BUTTON REMOVED FROM HERE --- */}

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
                     // onShowInsights={() => setViewMode('analysis')}
                     contentTopPadding={topPadding}
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
                        contentTopPadding={topPadding}
                        // Add exit prop here too so we can put a button inside ABCAnalysis if needed
                        onExit={handleClose} 
                     />
                  </Animated.View>
               ) : null}
            </View>
         </KeyboardAvoidingView>
      </>
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
   layer: {
      ...StyleSheet.absoluteFillObject,
      paddingHorizontal: 20, // Ensure this matches standard page padding
   },
   // Removed closeButton style from here as it lives in children now
});
