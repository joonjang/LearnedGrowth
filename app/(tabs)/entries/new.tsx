import rawAbcde from '@/assets/data/abcde.json';
import InputBox from '@/components/newEntry/InputBox';
import PromptDisplay from '@/components/newEntry/PromptDisplay';
import StepperButton from '@/components/newEntry/StepperButton';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { useEntries } from '@/hooks/useEntries';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { usePromptLayout } from '@/hooks/usePromptLayout';
import { usePrompts } from '@/hooks/usePrompts';
import { useVisitedSet } from '@/hooks/useVisitedSet';
import { NewInputEntryType } from '@/models/newInputEntryType';
// REMOVED: import { useTheme } ...
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
   Alert,
   Keyboard,
   KeyboardAvoidingView,
   Platform,
   Pressable,
   ScrollView,
   TextInput,
   View,
} from 'react-native';
// KEPT: Use insets for true edge-to-edge control
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEP_ORDER = ['adversity', 'belief', 'consequence'] as const;
const STEP_LABEL: Record<NewInputEntryType, string> = {
   adversity: 'Adversity',
   belief: 'Belief',
   consequence: 'Consequence',
};

export default function NewEntryModal() {
   const store = useEntries();
   const insets = useSafeAreaInsets(); // <-- The correct tool for Edge-to-Edge
   
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#f8fafc' : '#0f172a'; // text vs text-inverse

   const { hasVisited, markVisited } = useVisitedSet<NewInputEntryType>();
   const inputRef = useRef<TextInput>(null);
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

   const submit = useCallback(async () => {
      const { adversity, belief, consequence } = trimmedForm;

      if (!adversity || !belief || !consequence) {
         Alert.alert('Add required text', 'Please fill in all fields before saving.');
         return;
      }

      const newEntry = await store.createEntry(adversity, belief, consequence);

      router.replace({
         pathname: '/(tabs)/entries/[id]',
         params: { id: newEntry.id, animateInstant: '1' },
      });
   }, [store, trimmedForm]);

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
                     <Pressable
                        accessibilityRole="button"
                        onPress={handleClose}
                        hitSlop={12}
                        className="p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 items-center justify-center active:opacity-70"
                     >
                        <Ionicons
                           name="close"
                           size={22}
                           color={iconColor}
                        />
                     </Pressable>
                  </View>

                  <PromptDisplay
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
      </>
   );
}
