import rawAbcde from '@/assets/data/abcde.json';
import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import InputBox from '@/components/newEntry/InputBox';
import PromptDisplay, { PromptDisplayHandle } from '@/components/newEntry/PromptDisplay';
import StepperButton from '@/components/newEntry/StepperButton';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { useEntries } from '@/hooks/useEntries';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { usePromptLayout } from '@/hooks/usePromptLayout';
import { usePrompts } from '@/hooks/usePrompts';
import { useVisitedSet } from '@/hooks/useVisitedSet';
import { NewInputEntryType } from '@/models/newInputEntryType';
// REMOVED: import { useTheme } ...
import { router, useRootNavigationState } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
   Alert,
   Keyboard,
   Platform,
   ScrollView,
   TextInput,
   View
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
// KEPT: Use insets for true edge-to-edge control
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEP_ORDER = ['adversity', 'belief', 'consequence'] as const;
const STEP_LABEL: Record<NewInputEntryType, string> = {
   adversity: 'Adversity',
   belief: 'Belief',
   consequence: 'Consequence',
};
const STEP_PLACEHOLDER: Record<NewInputEntryType, string> = {
   adversity: 'Describe the situation briefly',
   belief: 'Capture the core thought',
   consequence: 'Feelings, reactions, and behaviors',
};

const routeTreeHasEntryDetail = (state: any, entryId: string | number) => {
   if (!state?.routes?.length) return false;
   for (const route of state.routes as any[]) {
      const name = route?.name as string | undefined;
      const paramsId = route?.params?.id;
      const isEntryDetailRoute =
         !!name &&
         (name.includes('entries/[id]') || name === '[id]/index');

      if (
         isEntryDetailRoute &&
         paramsId !== undefined &&
         String(paramsId) === String(entryId)
      ) {
         return true;
      }
      if (route?.state && routeTreeHasEntryDetail(route.state, entryId)) {
         return true;
      }
   }
   return false;
};

export default function NewEntryModal() {
   const store = useEntries();
   const insets = useSafeAreaInsets(); // <-- The correct tool for Edge-to-Edge
   const rootNavigationState = useRootNavigationState();

   const { hasVisited, markVisited } = useVisitedSet<NewInputEntryType>();
   const inputRef = useRef<TextInput>(null);
   const promptRef = useRef<PromptDisplayHandle | null>(null);
   const { promptTextStyle, inputBoxDims, promptMaxHeight } = usePromptLayout();
   const isKeyboardVisible = useKeyboardVisible();
   
   // Logic: Start below the notch (insets.top) + some breathing room (12px)
   const topPadding = insets.top + 12;

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
   const [isSubmitting, setIsSubmitting] = useState(false);
   const submittingRef = useRef(false);

   const submit = useCallback(async () => {
      if (submittingRef.current) return;
      const { adversity, belief, consequence } = trimmedForm;

      if (!adversity || !belief || !consequence) {
         Alert.alert('Add required text', 'Please fill in all fields before saving.');
         return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);

      try {
         const newEntry = await store.createEntry(adversity, belief, consequence);

         const targetRoute = {
            pathname: '/(tabs)/entries/[id]',
            params: { id: newEntry.id, animateInstant: '1' },
         } as const;

         const hasExistingDetail = routeTreeHasEntryDetail(
            rootNavigationState,
            newEntry.id
         );

         if (hasExistingDetail) {
            router.back();
            return;
         }

         // Replace the modal with the new entry detail to avoid duplicate stacking.
         router.replace(targetRoute);
      } catch (e) {
         console.error('Failed to create entry', e);
         Alert.alert('Save failed', 'Could not save the entry. Please try again.');
         submittingRef.current = false;
         setIsSubmitting(false);
      }
   }, [rootNavigationState, store, trimmedForm]);

   const handleStepChange = useCallback(
      (direction: 'next' | 'back') => {
         promptRef.current?.stop({ finish: true });
         const delta = direction === 'next' ? 1 : -1;
         const nextIdx = Math.min(
            Math.max(idx + delta, 0),
            STEP_ORDER.length - 1
         );
         const nextKey = STEP_ORDER[nextIdx];
         inputRef.current?.setNativeProps({ text: form[nextKey] ?? '' });
         setIdx(nextIdx);
      },
      [form, idx, inputRef, setIdx]
   );

   const handleClose = useCallback(() => {
      if (!hasAnyContent) {
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
   }, [hasAnyContent]);

   return (
      <>
         <KeyboardAvoidingView
            className="flex-1 bg-slate-50 dark:bg-slate-900"
            behavior={'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
         >
            {/* NO SafeAreaView Wrapper here. We want the ScrollView to touch the top edge. */}
            
            <View className="flex-1 px-5">
               <ScrollView
                  className="flex-1"
                  contentContainerStyle={{
                     flexGrow: 1,
                     gap: 16, // Replaces styles.scrollContent
                     paddingTop:  Platform.OS === 'android' ? topPadding : 12, // <-- Pushes content down, but lets it scroll up
                  }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
               >
                  {/* HEADER ROW */}
                  <View className="flex-row items-center mb-4">
                     
                     {/* Stepper Container */}
                     <View className="flex-1 mr-2">
                        <StepperHeader
                           step={idx + 1}
                           total={STEP_ORDER.length}
                           label={STEP_LABEL[currKey]}
                        />
                     </View>

                     {/* Close Button */}
                     <RoundedCloseButton onPress={handleClose} />
                  </View>

                  <PromptDisplay
                     ref={promptRef}
                     text={prompts[currKey]}
                     visited={hasVisited(currKey)}
                     onVisited={() => markVisited(currKey)}
                     textStyle={promptTextStyle}
                     maxHeight={promptMaxHeight}
                     scrollEnabled
                     numberOfLines={6}
                     containerStyle={{ flexGrow: 1, justifyContent: 'space-evenly' }}
                  />
               </ScrollView>

               {/* INPUT WRAPPER */}
               <View className={isKeyboardVisible ? 'pb-0' : 'pb-6'}>
                  <InputBox

                     ref={inputRef}
                     value={form[currKey]}
                     onChangeText={setField(currKey)}
                     placeholder={STEP_PLACEHOLDER[currKey]}
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
                     disableNext={currentEmpty || isSubmitting}
                     inputRef={inputRef}
                     onNext={() => handleStepChange('next')}
                     onBack={() => handleStepChange('back')}
                  />
               </View>
                
            </View>
         </KeyboardAvoidingView>
      </>
   );
}
