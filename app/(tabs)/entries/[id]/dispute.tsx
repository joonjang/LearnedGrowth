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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, KeyboardEvents } from 'react-native-keyboard-controller';
import PromptDisplay from '@/components/newEntry/PromptDisplay';
import InputBox from '@/components/newEntry/InputBox';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';

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

   const scrollToBottom = useCallback(
      (animated = true) => {
         const ref = scrollRef.current;
         if (!ref) return;

         ref.scrollToEnd({ animated });
      },
      []
   );

   const handleScroll = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
         const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
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
               <View style={[styles.inputWrapper, 
                                 {paddingBottom: !isKeyboardVisible ? 24 : 0}
                              ]}>
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
               
            </View>
         </KeyboardAvoidingView>
   );
}

const styles = StyleSheet.create({
   root: { flex: 1,  backgroundColor: '#fff' },

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

   contextBox: { marginHorizontal: 16 },
   inputWrapper: {
      paddingHorizontal: 16,
   },

   centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
   },
});