import InputBox from '@/components/newEntry/InputBox';
import StepperButton from '@/components/newEntry/StepperButton';
import { useEntries } from '@/features/hooks/useEntries';
import { usePrompts } from '@/features/hooks/usePrompts';
import { useVisitedSet } from '@/features/hooks/useVisitedSet';
import { usePromptLayout } from '@/features/hooks/usePromptLayout';
import rawAbcde from '@/assets/data/abcde.json';
import { NewInputEntryType } from '@/models/newInputEntryType';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, TextInput, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PromptDisplay from '@/components/newEntry/PromptDisplay';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';

const STEP_ORDER = ['adversity', 'belief', 'consequence'] as const;
const STEP_LABEL: Record<NewInputEntryType, string> = {
   adversity: 'Adversity',
   belief: 'Belief',
   consequence: 'Consequence',
};

export default function NewEntryModal() {
   const store = useEntries();
   const insets = useSafeAreaInsets();
   const { hasVisited, markVisited } = useVisitedSet<NewInputEntryType>();
   const inputRef = useRef<TextInput>(null);
   const { promptTextStyle, inputBoxDims, promptMaxHeight } = usePromptLayout();
   const isKeyboardVisible = useKeyboardVisible();

   const [form, setForm] = useState<Record<NewInputEntryType, string>>({
      adversity: '',
      belief: '',
      consequence: '',
   });

   const promptListGetter = useCallback(
      (key: NewInputEntryType) => rawAbcde[key],
      []
   );
   const prompts = usePrompts(STEP_ORDER, promptListGetter);

   const [idx, setIdx] = useState(0);
   const currKey = STEP_ORDER[idx] as NewInputEntryType;

   const setField = useCallback(
      (k: NewInputEntryType) => (v: string) =>
         setForm((f) => ({ ...f, [k]: v })),
      []
   );

   const trimmedForm = useMemo(
      () => ({
         adversity: form.adversity.trim(),
         belief: form.belief.trim(),
         consequence: form.consequence.trim(),
      }),
      [form]
   );

   const hasAnyContent = useMemo(
      () => Object.values(trimmedForm).some(Boolean),
      [trimmedForm]
   );

   const currentEmpty = !trimmedForm[currKey];

    const submit = useCallback(async () => {
      const { adversity, belief, consequence } = trimmedForm;

      if (!adversity || !belief || !consequence) {
         Alert.alert(
            'Add required text',
            'Please fill in all fields before saving.'
         );
         return;
      }

      const newEntry = await store.createEntry(adversity, belief, consequence);

      // Replace the modal with detail on the entries stack so back returns to the list.
      router.replace({
         pathname: '/(tabs)/entries/[id]',
         params: { id: newEntry.id, animateInstant: '1' },
      });
   }, [store, trimmedForm]);


   // TODO: save entry if gesture swiped down and there is an input, or provide an alert to confirm closing

   return (
         <KeyboardAvoidingView
            style={styles.root}
            behavior={'padding'}
            keyboardVerticalOffset={insets.bottom + 24}
         >
            <View style={styles.page}>
               <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={[
                     styles.scrollContent,
                     { paddingTop: 24 },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  
               >
                  <StepperHeader
                     step={idx + 1}
                     total={STEP_ORDER.length}
                     label={STEP_LABEL[currKey]}
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
                  />
                  <StepperButton
                  idx={idx}
                  totalSteps={STEP_ORDER.length}
                  setIdx={setIdx}
                  onSubmit={submit}
                  onExit={() => router.back()}
                  hasUnsavedChanges={hasAnyContent}
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
      // paddingHorizontal: 16,
   },

   centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
   },
});