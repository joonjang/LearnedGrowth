import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import {
   View,
   Text,
   KeyboardAvoidingView,
   Platform,
   Keyboard,
   StyleSheet,
   Pressable,
   TextInput,
   ScrollView,
   Button,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
   SafeAreaView,
   useSafeAreaInsets,
} from 'react-native-safe-area-context';

import rawAbcde from '@/assets/data/abcde.json';
import { useEntries } from '@/features/hooks/useEntries';
import { NewInputDisputeType } from '@/models/newInputEntryType';
import { Entry } from '@/models/entry';
import type { AbcdeJson } from '@/models/abcdeJson';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';
import { TypeAnimation } from 'react-native-type-animation';
import { useDeferredReady } from '@/features/hooks/useDeferredReady';
import ThreeDotsLoader from '@/components/ThreeDotLoader';
import { useResponsiveFont } from '@/features/hooks/useResponsiveFont';

const STEP_ORDER = [
   'evidence',
   'alternatives',
   'usefulness',
   'energy',
] as const;
const STEP_LABEL: Record<NewInputDisputeType, string> = {
   evidence: 'Evidence',
   alternatives: 'Alternatives',
   usefulness: 'Usefulness',
   energy: 'Energy',
};

function pickRandomPrompt(list?: string[]) {
   if (!list?.length) return 'Empty JSON';
   const i = Math.floor(Math.random() * list.length);
   return list[i];
}

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
   const { id } = useLocalSearchParams<{ id?: string | string[] }>();
   const entryId = Array.isArray(id) ? id[0] : id;
   const store = useEntries();
   const entry = entryId ? store.getEntryById(entryId) : undefined;

   const [visited, setVisited] = useState<Set<NewInputDisputeType>>(new Set());
   const [idx, setIdx] = useState(0);
   const [form, setForm] = useState<Record<NewInputDisputeType, string>>({
      evidence: entry?.dispute ?? '',
      alternatives: '',
      usefulness: '',
      energy: entry?.energy ?? '',
   });

   // Hydrate form once when the entry appears so existing dispute/energy are preserved.
   useEffect(() => {
      if (!entry) return;
      setForm((prev) => {
         const hasUserInput = Object.values(prev).some((val) => !!val.trim());
         if (hasUserInput) return prev;

         return {
            evidence: entry.dispute ?? '',
            alternatives: '',
            usefulness: '',
            energy: entry.energy ?? '',
         };
      });
   }, [entry]);

   const prompts = useMemo<Record<NewInputDisputeType, string>>(() => {
      const data = rawAbcde as AbcdeJson;

      return {
         evidence: pickRandomPrompt(data.dispute?.evidence),
         alternatives: pickRandomPrompt(data.dispute?.alternatives),
         usefulness: pickRandomPrompt(data.dispute?.usefulness),
         energy: pickRandomPrompt(data.energy),
      };
   }, []);

   const currKey = STEP_ORDER[idx];
   const canGoBack = idx > 0;
   const isLast = idx === STEP_ORDER.length - 1;
   const currentEmpty = !form[currKey]?.trim();

   const isKeyboardVisible = useKeyboardVisible();
   const promptSize: 'default' | 'compact' = 'compact';
   const inputRef = useRef<TextInput>(null);
   const scrollRef = useRef<ScrollView>(null);
   const readyToAnimate = useDeferredReady(1200);
   const { scaleFont } = useResponsiveFont();
   const insets = useSafeAreaInsets();

   const stickToBottom = useRef(true);

   const scrollToBottom = useCallback(
      (animated = true) => scrollRef.current?.scrollToEnd({ animated }),
      []
   );

   const handleScroll = useCallback((e) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const gap =
         contentSize.height - (contentOffset.y + layoutMeasurement.height);
      stickToBottom.current = gap < 12; // consider “at bottom” if within 12px
   }, []);

   const setField = useCallback(
      (k: NewInputDisputeType) => (v: string) =>
         setForm((f) => ({
            ...f,
            [k]: v,
         })),
      []
   );

   const { baseFont, minFont } = useMemo(() => {
      if (promptSize === 'compact') {
         return {
            baseFont: scaleFont(30, { min: 22, max: 40, factor: 0.35 }),
            minFont: scaleFont(24, { min: 20, max: 32, factor: 0.35 }),
         };
      }
      return {
         baseFont: scaleFont(38, { min: 26, max: 48, factor: 0.4 }),
         minFont: scaleFont(30, { min: 22, max: 40, factor: 0.4 }),
      };
   }, [promptSize, scaleFont]);

   const promptTextStyle = useMemo(
      () => ({
         ...styles.promptText,
         fontSize: isKeyboardVisible ? minFont : baseFont,
      }),
      [isKeyboardVisible, minFont, baseFont]
   );

   const inputBoxDims = useMemo(() => {
      const baseMin = promptSize === 'compact' ? 140 : 160;
      const baseMax = promptSize === 'compact' ? 280 : 320;
      const minHeight = isKeyboardVisible
         ? Math.max(100, baseMin - 40)
         : baseMin;

      return { minHeight, maxHeight: baseMax };
   }, [promptSize, isKeyboardVisible]);

   const promptSequence = useMemo(
      () => [
         { text: prompts[currKey] },
         {
            action: () =>
               setVisited((prev) => {
                  if (prev.has(currKey)) return prev;
                  const next = new Set(prev);
                  next.add(currKey);
                  return next;
               }),
         },
      ],
      [prompts, currKey, setVisited]
   );

   const submit = useCallback(async () => {
      if (!entry) return;

      const dispute = buildDisputeText(form);
      const nextEnergy = form.energy?.trim() ?? '';

      const patch: Partial<Entry> = {};
      if (dispute !== (entry.dispute ?? '')) patch.dispute = dispute;
      if (nextEnergy !== (entry.energy ?? '')) patch.energy = nextEnergy;

      if (Object.keys(patch).length) {
         await store.updateEntry(entry.id, patch);
      }
      router.back();
   }, [entry, form, store]);

   function onNext() {
      if (isLast) submit();
      else setIdx((i) => i + 1);
   }

   function onBack() {
      if (!canGoBack) router.back();
      if (canGoBack) setIdx((i) => i - 1);
   }

   useEffect(() => {
      const sub = Keyboard.addListener('keyboardDidShow', () => {
         requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
         });
      });

      return () => sub.remove();
   }, []);

   if (!entry) {
      return (
         <SafeAreaView style={styles.centered}>
            <Text>Entry not found.</Text>
         </SafeAreaView>
      );
   }

   return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
         <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
         >
            <View style={styles.page}>
               {/* HEADER */}
               <Text style={styles.headerText}>
                  Step {idx + 1} of {STEP_ORDER.length} — {STEP_LABEL[currKey]}
               </Text>

               {/* EVERYTHING ELSE SCROLLS AS ONE LAYOUT (TOP CONTEXT, BOTTOM INTERACTION) */}
               <ScrollView
                  ref={scrollRef}
                  style={styles.scroll}
                  contentContainerStyle={[
                     styles.scrollContent,
                    //  {
                    //     paddingBottom: isKeyboardVisible
                    //        ? insets.bottom + 8
                    //        : insets.bottom + 16,
                    //  },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  onScrollBeginDrag={Keyboard.dismiss}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  onContentSizeChange={() => {
                     if (stickToBottom.current) {
                        requestAnimationFrame(() => scrollToBottom(true));
                     }
                  }}
               >
                  {/* TOP: CONTEXT BOX */}
                  <View style={styles.contextBox}>
                     <View style={styles.contextRow}>
                        <Text style={styles.contextLabel}>Adversity</Text>
                        <Text style={styles.contextText}>
                           {entry.adversity}
                        </Text>
                     </View>
                     <View style={styles.contextDivider} />
                     <View style={styles.contextRow}>
                        <Text style={styles.contextLabel}>Belief</Text>
                        <Text style={styles.contextText}>{entry.belief}</Text>
                     </View>
                  </View>

                  {/* BOTTOM GROUP: PROMPT + INPUT + BUTTONS (NO GAP BETWEEN PROMPT & INPUT) */}

                  {/* PROMPT */}
                  <View>
                     {visited.has(currKey) ? (
                        <Text
                           style={promptTextStyle}
                           numberOfLines={6}
                           adjustsFontSizeToFit
                           minimumFontScale={0.85}
                           allowFontScaling
                        >
                           {prompts[currKey]}
                        </Text>
                     ) : readyToAnimate ? (
                        <TypeAnimation
                            key={currKey} 
                           sequence={promptSequence}
                           cursor={false}
                           typeSpeed={50}
                           style={promptTextStyle}
                        />
                     ) : (
                        <View style={{ padding: 48, flex: 1}}>
                        <ThreeDotsLoader />
                        </View>
                     )}
                  </View>
               </ScrollView>

               {/* INPUT */}
               <View style={styles.inputContainer}>
                  <Pressable
                     onPress={() => inputRef.current?.focus()}
                     style={[styles.inputBox, inputBoxDims]}
                  >
                     <TextInput
                        ref={inputRef}
                        placeholder="Enter here"
                        value={form[currKey]}
                        onChangeText={setField(currKey)}
                        style={styles.inputText}
                        multiline
                        scrollEnabled={false} // let ScrollView scroll vertically
                        textAlignVertical="top"
                        onFocus={() => {
                           scrollRef.current?.scrollToEnd({
                              animated: true,
                           });
                        }}
                     />
                  </Pressable>
               </View>

               {/* BUTTONS (CUSTOM, CENTERED LABELS) */}
               <View
                  style={[
                     styles.actionsRow,

                  ]}
               >
                  <View style={styles.actionCol}>
                     <Button
                        title={!canGoBack ? 'Close' : 'Back'}
                        onPress={onBack}
                        color={!canGoBack ? 'red' : undefined}
                     />
                  </View>
                  <View style={styles.actionCol}>
                     <Button
                        title={isLast ? 'Finish' : 'Next'}
                        onPress={onNext}
                        disabled={currentEmpty}
                        color={isLast ? 'red' : undefined}
                     />
                  </View> 
               </View>
            </View>
         </KeyboardAvoidingView>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   safeArea: { flex: 1, backgroundColor: '#fff' },
   root: { flex: 1 },

   page: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
      gap: 10,
   },

   headerText: { fontSize: 16 },

   scroll: { flex: 1 },
   scrollContent: {
      flexGrow: 1,
      justifyContent: 'space-between', // top context, bottom interaction block
      gap: 16,
      paddingBottom: 24
   },

   // Top context
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
   contextDivider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginVertical: 2,
   },

   // promptContainer: {
   //    paddingHorizontal: 16,
   // },

   promptText: {
      fontWeight: '600',
      flexShrink: 1,
      padding: 16,
      paddingBottom: 24,
   },

   inputContainer: {
      paddingHorizontal: 16,
   },

   inputBox: {
      borderRadius: 10,
      backgroundColor: '#e3e3e3ff',
      paddingHorizontal: 12,
      paddingVertical: 8,
      overflow: 'hidden',
   },

   inputText: {
      fontSize: 18,
      lineHeight: 24,
      color: '#111',
      includeFontPadding: false as any,
   },

   // Actions
   actionsRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
   },
   actionButton: {
      flex: 1,
   },
   actionCol: { flex: 1 },
   actionButtonDanger: {
      backgroundColor: '#DC2626',
   },

   actionButtonText: {
      fontSize: 16,
      textAlign: 'center',
   },

   centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
   },
});
