import rawAbcde from '@/assets/data/abcde.json';
import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import StepperButton from '@/components/buttons/StepperButton';
import InputBox from '@/components/newEntry/InputBox';
import PromptDisplay, {
   PromptDisplayHandle,
} from '@/components/newEntry/PromptDisplay';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { useEntries } from '@/hooks/useEntries';
import { usePromptLayout } from '@/hooks/usePromptLayout';
import { usePrompts } from '@/hooks/usePrompts';
import { useVisitedSet } from '@/hooks/useVisitedSet';
import { ENTRY_CHAR_LIMITS, ROUTE_ENTRY_DETAIL } from '@/lib/constants';
import { NewInputEntryType } from '@/models/newInputEntryType';
import { router, useRootNavigationState } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
   Alert,
   Keyboard,
   NativeScrollEvent,
   NativeSyntheticEvent,
   Platform,
   ScrollView,
   TextInput,
   View,
} from 'react-native';
import {
   AndroidSoftInputModes,
   KeyboardController,
   KeyboardEvents,
} from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
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

// ... routeTreeHasEntryDetail helper (unchanged) ...
const routeTreeHasEntryDetail = (state: any, entryId: string | number) => {
   if (!state?.routes?.length) return false;
   for (const route of state.routes as any[]) {
      const name = route?.name as string | undefined;
      const paramsId = route?.params?.id;
      const isEntryDetailRoute = !!name && name.includes('entryDetail/[id]');

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
   useEffect(() => {
      if (Platform.OS === 'android') {
         KeyboardController.setInputMode(
            AndroidSoftInputModes.SOFT_INPUT_ADJUST_NOTHING,
         );
      }
      return () => {
         if (Platform.OS === 'android') {
            KeyboardController.setDefaultMode();
         }
      };
   }, []);

   const store = useEntries();
   const insets = useSafeAreaInsets();
   const rootNavigationState = useRootNavigationState();

   const { hasVisited, markVisited } = useVisitedSet<NewInputEntryType>();
   const inputRef = useRef<TextInput>(null);
   const promptRef = useRef<PromptDisplayHandle | null>(null);

   // 1. Add Scroll Refs
   const scrollRef = useRef<ScrollView>(null);
   const stickToBottom = useRef(true); // Default to auto-scrolling

   const {
      promptTextStyle,
      promptTextAnimatedStyle,
      inputBoxAnimatedStyle,
      keyboardPaddingStyle,
   } = usePromptLayout();

   const topPadding = insets.top + 12;

   const [form, setForm] = useState<Record<NewInputEntryType, string>>({
      adversity: '',
      belief: '',
      consequence: '',
   });

   const promptListGetter = useCallback(
      (key: NewInputEntryType) => rawAbcde[key],
      [],
   );
   const prompts = usePrompts(STEP_ORDER, promptListGetter);
   const [idx, setIdx] = useState(0);
   const currKey = STEP_ORDER[idx] as NewInputEntryType;

   const setField = useCallback(
      (k: NewInputEntryType) => (v: string) =>
         setForm((f) => ({ ...f, [k]: v })),
      [],
   );

   const trimmedForm = useMemo(
      () => ({
         adversity: form.adversity.trim(),
         belief: form.belief.trim(),
         consequence: form.consequence.trim(),
      }),
      [form],
   );

   const hasAnyContent = useMemo(
      () => Object.values(trimmedForm).some(Boolean),
      [trimmedForm],
   );
   const currentEmpty = !trimmedForm[currKey];
   const [isSubmitting, setIsSubmitting] = useState(false);
   const submittingRef = useRef(false);

   // 2. Scroll Logic Helpers
   const scrollToBottom = useCallback((animated = true) => {
      if (stickToBottom.current && scrollRef.current) {
         scrollRef.current.scrollToEnd({ animated });
      }
   }, []);

   const handleScroll = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
         const { layoutMeasurement, contentOffset, contentSize } =
            e.nativeEvent;
         const paddingToBottom = 20;
         // If user is within 20px of the bottom, we "stick" to the bottom
         const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom;
         stickToBottom.current = isCloseToBottom;
      },
      [],
   );

   // 3. Keyboard Listener: Force scroll when keyboard opens
   useEffect(() => {
      const handleShow = () => {
         stickToBottom.current = true; // Reset stickiness so it definitely scrolls
         // Small delay ensures layout calculation of the shrink has happened
         requestAnimationFrame(() => scrollToBottom(true));
      };

      const didShowSub = KeyboardEvents.addListener(
         'keyboardDidShow',
         handleShow,
      );
      return () => {
         didShowSub.remove();
      };
   }, [scrollToBottom]);

   // 4. Reset scroll stickiness when step changes
   useEffect(() => {
      stickToBottom.current = true;
      requestAnimationFrame(() => scrollToBottom(false));
   }, [idx, scrollToBottom]);

   const submit = useCallback(async () => {
      if (submittingRef.current) return;
      const { adversity, belief, consequence } = trimmedForm;

      if (!adversity || !belief || !consequence) {
         Alert.alert(
            'Add required text',
            'Please fill in all fields before saving.',
         );
         return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);

      try {
         const newEntry = await store.createEntry(
            adversity,
            belief,
            consequence,
         );
         const targetRoute = {
            pathname: ROUTE_ENTRY_DETAIL,
            params: { id: newEntry.id, animateInstant: '1' },
         } as const;

         const hasExistingDetail = routeTreeHasEntryDetail(
            rootNavigationState,
            newEntry.id,
         );

         if (hasExistingDetail) {
            router.back();
            return;
         }
         router.replace(targetRoute);
      } catch (e) {
         console.error('Failed to create entry', e);
         Alert.alert(
            'Save failed',
            'Could not save the entry. Please try again.',
         );
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
            STEP_ORDER.length - 1,
         );
         const nextKey = STEP_ORDER[nextIdx];
         const nextValue = form[nextKey] ?? '';
         inputRef.current?.setNativeProps({ text: nextValue });
         if (Platform.OS === 'android') {
            requestAnimationFrame(() => {
               inputRef.current?.setNativeProps({
                  selection: { start: 0, end: 0 },
               });
            });
         }
         setIdx(nextIdx);
      },
      [form, idx, inputRef, setIdx],
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
            {
               text: 'Discard',
               style: 'destructive',
               onPress: () => router.back(),
            },
         ],
      );
   }, [hasAnyContent]);

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <Animated.View style={[{ flex: 1 }, keyboardPaddingStyle]}>
            <View className="flex-1 px-5">
               <View className="flex-1 overflow-hidden">
                  <ScrollView
                     ref={scrollRef} // Attach Ref
                     onScroll={handleScroll} // Listen for manual scrolls
                     scrollEventThrottle={16}
                     onContentSizeChange={() => scrollToBottom(true)} // Auto-scroll on resize
                     className="flex-1"
                     contentContainerStyle={{
                        flexGrow: 1,
                        gap: 16,
                        paddingTop: Platform.OS === 'android' ? topPadding : 16,
                        paddingBottom: 10,
                     }}
                     keyboardShouldPersistTaps="handled"
                     showsVerticalScrollIndicator={false}
                     scrollEnabled={true}
                  >
                     <View className="flex-row items-center mb-2">
                        <View className="flex-1 mr-2">
                           <StepperHeader
                              step={idx + 1}
                              total={STEP_ORDER.length}
                              label={STEP_LABEL[currKey]}
                           />
                        </View>
                        <RoundedCloseButton onPress={handleClose} />
                     </View>

                     <PromptDisplay
                        key={currKey}
                        ref={promptRef}
                        text={prompts[currKey]}
                        visited={hasVisited(currKey)}
                        onVisited={() => markVisited(currKey)}
                        textStyle={promptTextStyle}
                        textAnimatedStyle={promptTextAnimatedStyle}
                        scrollEnabled
                        numberOfLines={6}
                        containerStyle={{ flexGrow: 1 }}
                        delay={idx === 0 ? 800 : 0}
                     />
                  </ScrollView>
               </View>

               <View>
                  <InputBox
                     ref={inputRef}
                     value={form[currKey]}
                     onChangeText={setField(currKey)}
                     placeholder={STEP_PLACEHOLDER[currKey]}
                     maxLength={ENTRY_CHAR_LIMITS[currKey]}
                     // No dims needed anymore, animatedStyle handles it
                     animatedStyle={inputBoxAnimatedStyle}
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
         </Animated.View>
      </View>
   );
}
