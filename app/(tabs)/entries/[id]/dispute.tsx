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
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
   SafeAreaView,
} from 'react-native-safe-area-context';
import { KeyboardAvoidingView, KeyboardEvents } from 'react-native-keyboard-controller';
import PromptDisplay from '@/components/newEntry/PromptDisplay';
import InputBox from '@/components/newEntry/InputBox';

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

   const baseline = useMemo(
      () => ({
         evidence: (entry?.dispute ?? '').trim(),
         alternatives: '',
         usefulness: '',
         energy: (entry?.energy ?? '').trim(),
      }),
      [entry]
   );

   const hasUnsavedChanges = useMemo(
      () =>
         trimmedForm.evidence !== baseline.evidence ||
         trimmedForm.alternatives !== baseline.alternatives ||
         trimmedForm.usefulness !== baseline.usefulness ||
         trimmedForm.energy !== baseline.energy,
      [baseline, trimmedForm]
   );

   const currentEmpty = !trimmedForm[currKey];

   const scrollRef = useRef<any>(null);
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
         const ref = scrollRef.current as any;
         if (!ref) return;

         if (typeof ref.scrollToEnd === 'function') {
            ref.scrollToEnd({ animated });
            return;
         }
         if (typeof ref.scrollTo === 'function') {
            ref.scrollTo({ y: Number.MAX_SAFE_INTEGER, animated });
         }
      },
      []
   );

   const handleScroll = useCallback((e: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const gap =
         contentSize.height - (contentOffset.y + layoutMeasurement.height);
      stickToBottom.current = gap < 12;
   }, []);

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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
         <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
         >
            <View style={styles.page}>
               <ScrollView
                  ref={scrollRef}
                  style={styles.scroll}
                  contentContainerStyle={[
                     styles.scrollContent,
                     { paddingBottom: 12 },
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
               <View style={styles.inputWrapper}>
                  <InputBox
                     ref={inputRef}
                     value={form[currKey]}
                     onChangeText={setField(currKey)}
                     dims={inputBoxDims}
                     scrollEnabled
                     onFocus={() => scrollToBottom(true)}
                  />
               </View>
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
         </KeyboardAvoidingView>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   safeArea: { flex: 1, backgroundColor: '#fff' },
   root: { flex: 1 },

   page: {
      flex: 1,
      paddingTop: 20,
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
