import rawAbcde from '@/assets/data/abcde.json';
import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import SmartInput from '@/components/inputABCDE/SmartInput';
import StepperHeader from '@/components/inputABCDE/StepperHeader';
import TypewriterText, {
   TypewriterHandle,
} from '@/components/inputABCDE/TypewriterText';
import TopFade from '@/components/utils/TopFade';
import { useEntries } from '@/hooks/useEntries';
import { usePrompts } from '@/hooks/usePrompts';
import { useSmartScroll } from '@/hooks/useSmartScroll';
import { useSmoothKeyboard } from '@/hooks/useSmoothKeyboard';
import { useVisitedSet } from '@/hooks/useVisitedSet';
import { ROUTE_ENTRY_DETAIL } from '@/lib/constants';
import { NewInputEntryType } from '@/models/newInputEntryType';
import { router, useRootNavigationState } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
   Alert,
   Keyboard,
   Platform,
   ScrollView,
   Text,
   TextInput,
   TouchableOpacity,
   useWindowDimensions,
   View,
} from 'react-native';
import {
   AndroidSoftInputModes,
   KeyboardController,
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
   const { height: screenHeight } = useWindowDimensions();

   const { hasVisited, markVisited } = useVisitedSet<NewInputEntryType>();
   const inputRef = useRef<TextInput>(null);
   const typewriterRef = useRef<TypewriterHandle>(null);

   // 1. USE THE NEW SCROLL HOOK
   const { scrollProps, reenableAutoScroll, scrollToBottom } = useSmartScroll();

   // 2. USE KEYBOARD ANIMATION HOOK
   const maxInputHeight = Math.floor(screenHeight * 0.25);
   const { animatedPromptStyle, animatedInputStyle, animatedWrapperStyle } =
      useSmoothKeyboard({
         closedHeight: maxInputHeight,
         promptHold: 0.5,
      });

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

   // Reset scroll on step change
   useEffect(() => {
      reenableAutoScroll();
      requestAnimationFrame(() => scrollToBottom(false));
   }, [idx, reenableAutoScroll, scrollToBottom]);

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

   const handleStepChange = useCallback(
      (direction: 'next' | 'back') => {
         if (direction === 'back' && idx === 0) {
            handleClose();
            return;
         }

         // Re-enable stickiness for the new step
         reenableAutoScroll();

         const delta = direction === 'next' ? 1 : -1;
         const nextIdx = Math.min(
            Math.max(idx + delta, 0),
            STEP_ORDER.length - 1,
         );

         const nextKey = STEP_ORDER[nextIdx];
         const nextValue = form[nextKey] ?? '';
         inputRef.current?.setNativeProps({ text: nextValue });

         markVisited(currKey);
         setIdx(nextIdx);
      },
      [form, idx, currKey, markVisited, handleClose, reenableAutoScroll],
   );

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <View className="absolute top-0 left-0 right-0 z-10">
            <TopFade height={topPadding} />
         </View>
         <Animated.View className="flex-1" style={animatedWrapperStyle}>
            <View className="flex-1">
               {/* SCROLL VIEW (Using Hook Props) */}
               <ScrollView
                  {...scrollProps}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                     flexGrow: 1, // Required for centering
                     paddingTop: topPadding,
                  }}
                  className="px-5"
               >
                  {/* HEADER */}
                  <View className="flex-row items-center mb-2.5">
                     <View className="flex-1 mr-2">
                        <StepperHeader
                           step={idx + 1}
                           total={STEP_ORDER.length}
                           label={STEP_LABEL[currKey]}
                        />
                     </View>
                     <RoundedCloseButton onPress={handleClose} />
                  </View>

                  {/* PROMPT (Vertically Centered) */}
                  <View className="flex-1 justify-center">
                     <TypewriterText
                        ref={typewriterRef}
                        text={prompts[currKey]}
                        visited={hasVisited(currKey)}
                        onFinished={() => markVisited(currKey)}
                        style={[{ fontWeight: '700' }, animatedPromptStyle]}
                     />
                  </View>

                  {/* Spacer */}
                  <View className="h-5" />
               </ScrollView>

               {/* FOOTER */}
               <View className="px-5">
                  <View className="my-2.5">
                     <SmartInput
                        ref={inputRef}
                        value={form[currKey]}
                        onChangeText={setField(currKey)}
                        placeholder={STEP_PLACEHOLDER[currKey]}
                        // Dynamic height from hook
                        animatedStyle={animatedInputStyle}
                        onFocus={() => {
                           // Use helper to snap to bottom on focus
                           reenableAutoScroll(true);
                        }}
                     />
                  </View>

                  <View className="flex-row h-[50px] gap-3 items-center">
                     <TouchableOpacity
                        onPress={() => handleStepChange('back')}
                        className="flex-1 justify-center items-center"
                     >
                        <Text
                           className={`text-base font-semibold ${
                              idx === 0
                                 ? 'text-rose-600 dark:text-rose-400'
                                 : 'text-slate-900 dark:text-slate-100'
                           }`}
                        >
                           {idx === 0 ? 'Close' : 'Back'}
                        </Text>
                     </TouchableOpacity>

                     <View className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />

                     <TouchableOpacity
                        onPress={
                           idx === STEP_ORDER.length - 1
                              ? submit
                              : () => handleStepChange('next')
                        }
                        disabled={currentEmpty || isSubmitting}
                        className={`flex-1 justify-center items-center ${
                           currentEmpty || isSubmitting
                              ? 'opacity-50'
                              : 'opacity-100'
                        }`}
                     >
                        <Text
                           className={`text-base font-semibold ${
                              idx === STEP_ORDER.length - 1
                                 ? 'text-rose-600 dark:text-rose-400'
                                 : 'text-slate-900 dark:text-slate-100'
                           }`}
                        >
                           {idx === STEP_ORDER.length - 1 ? 'Finish' : 'Next'}
                        </Text>
                     </TouchableOpacity>
                  </View>
               </View>
            </View>
         </Animated.View>
      </View>
   );
}
