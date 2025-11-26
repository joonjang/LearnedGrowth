import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
   View,
   Text,
   Button,
   KeyboardAvoidingView,
   Platform,
   TouchableWithoutFeedback,
   Keyboard,
   StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import InputField from '@/components/entries/InputField';
import rawAbcde from '@/assets/data/abcde.json';
import { useEntries } from '@/features/hooks/useEntries';
import { NewInputDisputeType } from '@/models/newInputEntryType';
import { Entry } from '@/models/entry';
import type { AbcdeJson } from '@/models/abcdeJson';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';

const STEP_ORDER = ['evidence', 'alternatives', 'usefulness', 'energy'] as const;
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
         const hasUserInput = Object.values(prev).some(
            (val) => !!val.trim()
         );
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

   const setField = useCallback(
      (k: NewInputDisputeType) => (v: string) =>
         setForm((f) => ({
            ...f,
            [k]: v,
         })),
      []
   );

   const insets = useSafeAreaInsets();
   const keyboardVerticalOffset = 0;

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
      if (canGoBack) setIdx((i) => i - 1);
   }

   if (!entry) {
      return (
         <SafeAreaView style={styles.centered}>
            <Text>Entry not found.</Text>
            <Button title="Back" onPress={() => router.back()} />
         </SafeAreaView>
      );
   }

   return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
         <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={keyboardVerticalOffset}
         >
            <TouchableWithoutFeedback
               onPress={Keyboard.dismiss}
               accessible={false}
            >
               <View
                  style={[
                     styles.page,
                     isKeyboardVisible && styles.pageKeyboardOpen,
                  ]}
               >
                  <Text style={styles.headerText}>
                     Step {idx + 1} of {STEP_ORDER.length} — {STEP_LABEL[currKey]}
                  </Text>

                  <View style={styles.contextBox}>
                     <View style={styles.contextRow}>
                        <Text style={styles.contextLabel}>Adversity</Text>
                        <Text style={styles.contextText}>{entry.adversity}</Text>
                     </View>
                     <View style={styles.contextDivider} />
                     <View style={styles.contextRow}>
                        <Text style={styles.contextLabel}>Belief</Text>
                        <Text style={styles.contextText}>{entry.belief}</Text>
                     </View>
                  </View>

                  <View style={styles.content}>
                     <InputField
                        key={currKey}
                        value={form[currKey]}
                        setValue={setField(currKey)}
                        entryType={currKey}
                        prompt={prompts[currKey]}
                        visited={visited.has(currKey)}
                        setVisited={setVisited}
                        promptSize="compact"
                     />
                  </View>

                  <View
                     style={[
                        styles.actionsRow,
                        {
                           paddingBottom: isKeyboardVisible ? 0 : 12,
                        },
                     ]}
                  >
                     <View style={styles.actionCol}>
                        <Button
                           title="Back"
                           onPress={onBack}
                           disabled={!canGoBack}
                        />
                     </View>
                     <View style={styles.actionCol}>
                        <Button
                           title={isLast ? 'Save' : 'Next'}
                           onPress={onNext}
                           disabled={currentEmpty}
                           color={isLast ? '#2563EB' : undefined}
                        />
                     </View>
                  </View>
               </View>
            </TouchableWithoutFeedback>
         </KeyboardAvoidingView>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   safeArea: { flex: 1, backgroundColor: '#fff' },
   root: { flex: 1 },
   page: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
      flex: 1,
      gap: 16,
   },
   pageKeyboardOpen: {
      paddingBottom: 0,
   },
   headerText: { fontSize: 16 },
   content: { flex: 1, minHeight: 0 },
   actionsRow: {
      flexDirection: 'row',
      minHeight: 64,
      maxHeight: 140,
      alignItems: 'center',
   },
   actionCol: { flex: 1 },
   centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
   },
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
});
