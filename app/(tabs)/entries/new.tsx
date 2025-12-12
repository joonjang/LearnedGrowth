import rawAbcde from '@/assets/data/abcde.json';
import InputBox from '@/components/newEntry/InputBox';
import PromptDisplay from '@/components/newEntry/PromptDisplay';
import StepperButton from '@/components/newEntry/StepperButton';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { useEntries } from '@/features/hooks/useEntries';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';
import { usePromptLayout } from '@/features/hooks/usePromptLayout';
import { usePrompts } from '@/features/hooks/usePrompts';
import { useVisitedSet } from '@/features/hooks/useVisitedSet';
import { NewInputEntryType } from '@/models/newInputEntryType';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
   Alert,
   Keyboard,
   KeyboardAvoidingView,
   Platform,
   Pressable,
   ScrollView,
   StyleSheet,
   TextInput,
   View,
} from 'react-native';
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
   const { mode, colors } = useTheme();
   const { hasVisited, markVisited } = useVisitedSet<NewInputEntryType>();
   const inputRef = useRef<TextInput>(null);
   const { promptTextStyle, inputBoxDims, promptMaxHeight } = usePromptLayout();
   const isKeyboardVisible = useKeyboardVisible();
   
   const topPadding = Platform.OS === 'android' ? insets.top + 12 : 20; 

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
   }, [hasAnyContent, router]);

   return (
      <>
         <StatusBar
            translucent
            backgroundColor="transparent"
            style={mode === 'dark' ? 'light' : 'dark'}
         />
         <KeyboardAvoidingView
            style={styles.root}
            behavior={'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
         >
            <View style={styles.page}>
               
               <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={[
                     styles.scrollContent,
                     { paddingTop: topPadding},
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
               >
                  {/* HEADER ROW CONTAINER */}
                  <View style={styles.headerRow}>
                     
                     {/* 1. Stepper takes available space */}
                     <View style={styles.stepperContainer}>
                        <StepperHeader
                           step={idx + 1}
                           total={STEP_ORDER.length}
                           label={STEP_LABEL[currKey]}
                        />
                     </View>

                     {/* 2. Close button sits to the right */}
                     <Pressable
                        accessibilityRole="button"
                        onPress={handleClose}
                        hitSlop={12}
                        style={[
                           styles.closeButton,
                           {
                              backgroundColor: colors.cardBg,
                              borderColor: colors.border,
                           },
                        ]}
                     >
                        <Ionicons
                           name="close"
                           size={22}
                           color={colors.text}
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
                     containerStyle={styles.promptContainer}
                  />
               </ScrollView>

               <View style={[styles.inputWrapper, {paddingBottom: !isKeyboardVisible ? 24 : 0}]}>
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

const styles = StyleSheet.create({
   root: { flex: 1, backgroundColor: '#fff' },
   page: {
      flex: 1,
      paddingHorizontal: 20,
   },
   // NEW STYLES
   headerRow: {
      flexDirection: 'row',
      alignItems: 'center', // Aligns the text and button vertically
      marginBottom: 16,
      // If StepperHeader has its own top padding, you might want to reduce it there
   },
   stepperContainer: {
      flex: 1, // Takes up all remaining width
      marginRight: 8, // Ensures text doesn't hit the close button
   },
   closeButton: {
      padding: 8,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
   },
   scroll: { flex: 1 },
   scrollContent: {
      flexGrow: 1,
      gap: 16,
   },
   promptContainer: {
      flexGrow: 1,
      justifyContent: 'space-evenly',
   },
   inputWrapper: {
      // paddingHorizontal: 16,
   },
});
