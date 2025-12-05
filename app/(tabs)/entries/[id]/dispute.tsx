import EntryContextView from '@/components/newEntry/EntryContextView';
import StepperButton from '@/components/newEntry/StepperButton';
import StepperHeader from '@/components/newEntry/StepperHeader';
import rawAbcde from '@/assets/data/abcde.json';
import { usePrompts } from '@/features/hooks/usePrompts';
import { useVisitedSet } from '@/features/hooks/useVisitedSet';
import { useEntries } from '@/features/hooks/useEntries';
import { usePromptLayout } from '@/features/hooks/usePromptLayout';
import { Entry } from '@/models/entry';
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
   Platform,
   ScrollView,
   StyleSheet,
   Text,
   TextInput,
   View,
} from 'react-native';
import {
   SafeAreaView,
   useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
   KeyboardAvoidingView,
   KeyboardEvents,
} from 'react-native-keyboard-controller';
import PromptDisplay from '@/components/newEntry/PromptDisplay';
import InputBox from '@/components/newEntry/InputBox';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';
import { useAbcAi } from '@/features/hooks/useAbcAi';
import ThreeDotsLoader from '@/components/ThreeDotLoader';
import { AiInsightCard } from '@/components/entries/AiIngsightCard';
import Animated from 'react-native-reanimated';

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
const STEP_LABEL: Record<NewInputDisputeType, string> = {
   evidence: 'Evidence',
   alternatives: 'Alternatives',
   usefulness: 'Usefulness',
   energy: 'Energy',
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

type Highlight = { phrase: string; color?: string };
type HighlightMap = {
   adversity: Highlight[];
   belief: Highlight[];
   consequence: Highlight[];
};

function findMatches(text: string, phrase: string, color?: string) {
   const hay = text.toLowerCase();
   const needle = phrase.toLowerCase();
   const spans: { start: number; end: number; color?: string }[] = [];
   let idx = hay.indexOf(needle);
   while (idx !== -1) {
      spans.push({ start: idx, end: idx + needle.length, color });
      idx = hay.indexOf(needle, idx + needle.length);
   }
   return spans;
}

function buildSegments(text: string, highlights: Highlight[]) {
   if (!highlights.length) return [text];

   const matches = highlights.flatMap((h) =>
      findMatches(text, h.phrase, h.color)
   );
   if (!matches.length) return [text];

   const boundaries = new Set<number>([0, text.length]);
   matches.forEach(({ start, end }) => {
      boundaries.add(start);
      boundaries.add(end);
   });
   const points = Array.from(boundaries).sort((a, b) => a - b);

   const segments: Array<string | { text: string; color?: string }> = [];
   let overlapStripe = 0;

   for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      if (end <= start) continue;
      const slice = text.slice(start, end);
      const active = matches.filter((m) => m.start < end && m.end > start);

      if (!active.length) {
         segments.push(slice);
         continue;
      }

      let color: string | undefined;
      if (active.length === 1) {
         color = active[0].color;
      } else {
         color = active[overlapStripe % active.length].color || active[0].color;
         overlapStripe += 1;
      }
      segments.push({ text: slice, color });
   }

   return segments;
}

function HighlightedText({
   text,
   highlights,
}: {
   text: string;
   highlights: Highlight[];
}) {
   const segments = useMemo(
      () => buildSegments(text, highlights),
      [text, highlights]
   );

   return (
      <Text style={styles.contextText}>
         {segments.map((seg, i) =>
            typeof seg === 'string' ? (
               <Text key={i}>{seg}</Text>
            ) : (
               <Text
                  key={i}
                  style={[
                     styles.highlight,
                     seg.color ? { backgroundColor: seg.color } : null,
                  ]}
               >
                  {seg.text}
               </Text>
            )
         )}
      </Text>
   );
}

export default function DisputeScreen() {
   const { id, analyze: analyzeParam } = useLocalSearchParams<{
      id?: string | string[];
      analyze?: string | string[];
   }>();

   const entryId = Array.isArray(id) ? id[0] : id;
   const store = useEntries();
   const entry = entryId ? store.getEntryById(entryId) : undefined;
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
   const [permanencePressed, setPermanencePressed] = useState(false);
   const [pervasivenessPressed, setPervasivenessPressed] = useState(false);
   const [personalizationPressed, setPersonalizationPressed] = useState(false);

   const { analyze, lastResult, loading, error, ready, streamText, streaming } =
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

   const permanenceHighlights = useMemo<HighlightMap>(() => {
      const phrase = lastResult?.data?.analysis?.dimensions?.permanence?.detectedPhrase;
      if (!entry || !phrase) return { adversity: [], belief: [], consequence: [] };
      const needle = phrase.trim();
      if (!needle) return { adversity: [], belief: [], consequence: [] };
      const lower = needle.toLowerCase();
      const map: HighlightMap = { adversity: [], belief: [], consequence: [] };
      if (entry.adversity?.toLowerCase().includes(lower)) {
         map.adversity.push({ phrase: needle, color: DIMENSION_COLORS.permanence });
      }
      if (entry.belief?.toLowerCase().includes(lower)) {
         map.belief.push({ phrase: needle, color: DIMENSION_COLORS.permanence });
      }
      if (entry.consequence?.toLowerCase().includes(lower)) {
         map.consequence.push({ phrase: needle, color: DIMENSION_COLORS.permanence });
      }
      return map;
   }, [entry, lastResult?.data]);

   const pervasivenessHighlights = useMemo<HighlightMap>(() => {
      const phrase = lastResult?.data?.analysis?.dimensions?.pervasiveness?.detectedPhrase;
      if (!entry || !phrase) return { adversity: [], belief: [], consequence: [] };
      const needle = phrase.trim();
      if (!needle) return { adversity: [], belief: [], consequence: [] };
      const lower = needle.toLowerCase();
      const map: HighlightMap = { adversity: [], belief: [], consequence: [] };
      if (entry.adversity?.toLowerCase().includes(lower)) {
         map.adversity.push({ phrase: needle, color: DIMENSION_COLORS.pervasiveness });
      }
      if (entry.belief?.toLowerCase().includes(lower)) {
         map.belief.push({ phrase: needle, color: DIMENSION_COLORS.pervasiveness });
      }
      if (entry.consequence?.toLowerCase().includes(lower)) {
         map.consequence.push({ phrase: needle, color: DIMENSION_COLORS.pervasiveness });
      }
      return map;
   }, [entry, lastResult?.data]);

   const personalizationHighlights = useMemo<HighlightMap>(() => {
      const phrase =
         lastResult?.data?.analysis?.dimensions?.personalization?.detectedPhrase;
      if (!entry || !phrase) return { adversity: [], belief: [], consequence: [] };
      const needle = phrase.trim();
      if (!needle) return { adversity: [], belief: [], consequence: [] };
      const lower = needle.toLowerCase();
      const map: HighlightMap = { adversity: [], belief: [], consequence: [] };
      if (entry.adversity?.toLowerCase().includes(lower)) {
         map.adversity.push({ phrase: needle, color: DIMENSION_COLORS.personalization });
      }
      if (entry.belief?.toLowerCase().includes(lower)) {
         map.belief.push({ phrase: needle, color: DIMENSION_COLORS.personalization });
      }
      if (entry.consequence?.toLowerCase().includes(lower)) {
         map.consequence.push({ phrase: needle, color: DIMENSION_COLORS.personalization });
      }
      return map;
   }, [entry, lastResult?.data]);

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
         await store.updateEntry(entry.id, patch);
      }
      router.back();
   }, [entry, store, trimmedForm]);

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
      const t1 = setTimeout(() => {
         setPermanencePressed(true);
         setShowPermanenceHighlight(true);
      }, 800);
      const t2 = setTimeout(() => {
         setPermanencePressed(false);
         setShowPermanenceHighlight(false);
      }, 1300);
      return () => {
         clearTimeout(t1);
         clearTimeout(t2);
      };
   }, []);

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
            {!analysisTriggered && (
               <>
                  <ScrollView
                     ref={scrollRef}
                     style={styles.scroll}
                     contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: 24 },
                     ]}
                     keyboardShouldPersistTaps="handled"
                     showsVerticalScrollIndicator={false}
                     onScroll={handleScroll}
                     scrollEventThrottle={16}
                     onContentSizeChange={() => {
                        if (stickToBottom.current) {
                           requestAnimationFrame(() => scrollToBottom(true));
                        }
                     }}
                  >
                     <StepperHeader
                        step={idx + 1}
                        total={STEP_ORDER.length}
                        label={STEP_LABEL[currKey]}
                     />

                     <EntryContextView
                        adversity={entry.adversity}
                        belief={entry.belief}
                        consequence={entry.consequence ?? ''}
                        style={styles.contextBox}
                     />

                     <PromptDisplay
                        text={prompts[currKey]}
                        visited={hasVisited(currKey)}
                        onVisited={() => markVisited(currKey)}
                        textStyle={promptTextStyle}
                        maxHeight={promptMaxHeight}
                        scrollEnabled
                        numberOfLines={6}
                        containerStyle={styles.promptContainer}
                     />
                  </ScrollView>
                  <View
                     style={[
                        styles.inputWrapper,
                        { paddingBottom: !isKeyboardVisible ? 24 : 0 },
                     ]}
                  >
                     <InputBox
                        ref={inputRef}
                        value={form[currKey]}
                        onChangeText={setField(currKey)}
                        dims={inputBoxDims}
                        scrollEnabled
                        onFocus={() => scrollToBottom(true)}
                     />
                     <StepperButton
                        idx={idx}
                        totalSteps={STEP_ORDER.length}
                        setIdx={setIdx}
                        onSubmit={submit}
                        onExit={() => router.back()}
                        hasUnsavedChanges={hasUnsavedChanges}
                        disableNext={currentEmpty}
                     />
                  </View>
               </>
            )}
            {analysisTriggered && (
               <>
                  <ScrollView
                     ref={scrollRef}
                     style={styles.scroll}
                     contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: 24 },
                     ]}
                     keyboardShouldPersistTaps="handled"
                     showsVerticalScrollIndicator={false}
                     onScroll={handleScroll}
                     scrollEventThrottle={16}
                     onContentSizeChange={() => {
                        if (stickToBottom.current) {
                           requestAnimationFrame(() => scrollToBottom(true));
                        }
                     }}
                  >
                     <View style={[styles.container]}>
                        <Text style={styles.text}>AI Insight</Text>
                     </View>
                     <View style={{ flex: 1 }}>
                        <View style={[styles.contextBox]}>
                           <View style={styles.contextRow}>
                              <Text style={styles.contextLabel}>Adversity</Text>
                             <HighlightedText
                                text={entry.adversity}
                                highlights={
                                    [
                                       ...(showPermanenceHighlight
                                          ? permanenceHighlights.adversity
                                          : []),
                                       ...(showPervasivenessHighlight
                                          ? pervasivenessHighlights.adversity
                                          : []),
                                       ...(showPersonalizationHighlight
                                          ? personalizationHighlights.adversity
                                          : []),
                                    ]
                                 }
                             />
                           </View>
                           <View style={styles.contextDivider} />
                           <View style={styles.contextRow}>
                              <Text style={styles.contextLabel}>Belief</Text>
                             <HighlightedText
                                text={entry.belief}
                                highlights={
                                    [
                                       ...(showPermanenceHighlight
                                          ? permanenceHighlights.belief
                                          : []),
                                       ...(showPervasivenessHighlight
                                          ? pervasivenessHighlights.belief
                                          : []),
                                       ...(showPersonalizationHighlight
                                          ? personalizationHighlights.belief
                                          : []),
                                    ]
                                 }
                             />
                           </View>
                           {entry.consequence && (
                              <>
                                 <View style={styles.contextDivider} />
                                 <View style={styles.contextRow}>
                                    <Text style={styles.contextLabel}>
                                       Consequence
                                    </Text>
                                    <HighlightedText
                                       text={entry.consequence}
                                       highlights={
                                          [
                                             ...(showPermanenceHighlight
                                                ? permanenceHighlights.consequence
                                                : []),
                                             ...(showPervasivenessHighlight
                                                ? pervasivenessHighlights.consequence
                                                : []),
                                             ...(showPersonalizationHighlight
                                                ? personalizationHighlights.consequence
                                                : []),
                                          ]
                                       }
                                    />
                                 </View>
                              </>
                           )}
                        </View>
                     </View>

                     <View style={{ flex: 1 }}>
                        <AiInsightCard
                           data={lastResult?.data}
                           streamingText={streaming ? streamText : undefined}
                           loading={loading}
                           error={error}
                           onPressIn={(field) => {
                              if (field === 'permanence') {
                                 setShowPermanenceHighlight(true);
                              }
                              if (field === 'pervasiveness') {
                                 setShowPervasivenessHighlight(true);
                              }
                              if (field === 'personalization') {
                                 setShowPersonalizationHighlight(true);
                              }
                           }}
                           onPressOut={(field) => {
                              if (field === 'permanence') {
                                 setShowPermanenceHighlight(false);
                              }
                              if (field === 'pervasiveness') {
                                 setShowPervasivenessHighlight(false);
                              }
                              if (field === 'personalization') {
                                 setShowPersonalizationHighlight(false);
                              }
                           }}
                        />
                     </View>
                  </ScrollView>
               </>
            )}
         </View>
      </KeyboardAvoidingView>
   );
}

const styles = StyleSheet.create({
   root: { flex: 1, backgroundColor: '#fff' },

   page: {
      flex: 1,
      paddingHorizontal: 20,
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
