import InputBox from '@/components/newEntry/InputBox';
import StepperButton from '@/components/newEntry/StepperButton';
import StepperLayout, {
   KeyboardAwareInputWrapper,
} from '@/components/newEntry/StepperLayout';
import { useEntries } from '@/features/hooks/useEntries';
import { usePrompts } from '@/features/hooks/usePrompts';
import { useVisitedSet } from '@/features/hooks/useVisitedSet';
import { usePromptLayout } from '@/features/hooks/usePromptLayout';
import rawAbcde from '@/assets/data/abcde.json';
import { NewInputEntryType } from '@/models/newInputEntryType';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, TextInput } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

   const dismissKeyboard = useCallback(async () => {
      try {
         await KeyboardController.dismiss();
      } catch {
         Keyboard.dismiss();
      }
   }, []);

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

   return (
      <StepperLayout
         step={idx + 1}
         totalSteps={STEP_ORDER.length}
         label={STEP_LABEL[currKey]}
         prompt={{
            text: prompts[currKey],
            visited: hasVisited(currKey),
            onVisited: () => markVisited(currKey),
            textStyle: promptTextStyle,
            maxHeight: promptMaxHeight,
            scrollEnabled: true,
            numberOfLines: 6,
         }}
         inputSection={
            <KeyboardAwareInputWrapper>
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
            </KeyboardAwareInputWrapper>
         }
         topInset={insets.top}
         onBackgroundPress={dismissKeyboard}
      />
   );
}
