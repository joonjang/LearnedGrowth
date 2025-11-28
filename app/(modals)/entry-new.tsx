import InputField from '@/components/newEntry/InputField';
import StepperButton from '@/components/newEntry/StepperButton';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { useEntries } from '@/features/hooks/useEntries';
import { usePrompts } from '@/features/hooks/usePrompts';
import { useVisitedSet } from '@/features/hooks/useVisitedSet';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
   Platform,
   TouchableWithoutFeedback,
   View,
   StyleSheet,
   Keyboard,
} from 'react-native';
import rawAbcde from '@/assets/data/abcde.json';
// import rawAbcde from '@/assets/data/abcdeDev.json';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NewInputEntryType } from '@/models/newInputEntryType';
import {
   KeyboardAvoidingView,
   KeyboardController,
} from 'react-native-keyboard-controller';

const STEP_ORDER = ['adversity', 'belief', 'consequence'] as const;
const STEP_LABEL: Record<NewInputEntryType, string> = {
   adversity: 'Adversity',
   belief: 'Belief',
   consequence: 'Consequence',
};

export default function NewEntryModal() {
   const store = useEntries();
   const headerHeight = useHeaderHeight();
   const insets = useSafeAreaInsets();
   const { visited, hasVisited, markVisited } =
      useVisitedSet<NewInputEntryType>();

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

   const canGoBack = idx > 0;
   const isLast = idx === STEP_ORDER.length - 1;
   const currentEmpty = !form[currKey]?.trim();

   function onNext() {
      if (isLast) submit();
      else setIdx((i) => i + 1);
   }

   function onBack() {
      if (!canGoBack) router.back();
      if (canGoBack) setIdx((i) => i - 1);
   }

   const dismissKeyboard = useCallback(async () => {
      try {
         await KeyboardController.dismiss();
      } catch (e) {
         Keyboard.dismiss();
      }
   }, []);

   const submit = useCallback(() => {
      const { adversity, belief, consequence } = form;
      store.createEntry(adversity, belief, consequence);
      router.back();
   }, [form, store]);

   const keyboardVerticalOffset = Platform.OS === 'ios' ? headerHeight : 0;

   return (
      <KeyboardAvoidingView
         style={styles.root}
         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
         keyboardVerticalOffset={keyboardVerticalOffset}
      >
         <TouchableWithoutFeedback
            onPress={dismissKeyboard}
            accessible={false}
         >
            <View className="page" style={styles.page}>
               <StepperHeader
                  step={idx + 1}
                  total={STEP_ORDER.length}
                  label={STEP_LABEL[currKey]}
               />

               <View style={styles.content}>
                  <InputField
                     value={form[currKey]}
                     setValue={setField(currKey)}
                     entryType={currKey}
                     prompt={prompts[currKey]}
                     visited={hasVisited(currKey)}
                     markVisited={markVisited}
                     scrollEnabled
                  />
               </View>

               <StepperButton
                  canGoBack={canGoBack}
                  isLast={isLast}
                  onBack={onBack}
                  onNext={onNext}
                  disableNext={currentEmpty}
                  style={{ paddingBottom: insets.bottom + 12 }}
               />
            </View>
         </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
   );
}

const styles = StyleSheet.create({
   root: { flex: 1 },
   page: { padding: 20, flex: 1, gap: 16 },
   content: { flex: 1 },
});
