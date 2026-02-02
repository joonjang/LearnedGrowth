import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import React, { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import {
   Alert,
   Keyboard,
   Pressable,
   Text,
   TextInput,
   View,
   ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// REMOVED: import { makeThemedStyles, useTheme } from '@/theme/theme';

type Props = {
   idx: number;
   totalSteps: number;
   setIdx: Dispatch<SetStateAction<number>>;
   onSubmit: () => void;
   onExit: () => void;
   hasUnsavedChanges?: boolean;
   confirmExitTitle?: string;
   confirmExitMessage?: string;
   disableNext?: boolean;
   style?: ViewStyle;
   inputRef?: React.RefObject<TextInput | null>;
   onNext?: () => void;
   onBack?: () => void;
};

export default function StepperButton({
   idx,
   totalSteps,
   setIdx,
   onSubmit,
   onExit,
   hasUnsavedChanges = false,
   disableNext,
   style,
   inputRef,
   onNext,
   onBack,
}: Props) {
   const isKeyboardVisible = useKeyboardVisible();
   const insets = useSafeAreaInsets();
   // Logic
   const isLast = useMemo(() => idx === totalSteps - 1, [idx, totalSteps]);
   const canGoBack = useMemo(() => idx > 0, [idx]);
   const backLabel = !canGoBack ? 'Close' : 'Back';
   const nextLabel = isLast ? 'Finish' : 'Next';
   const baseTextClass = 'text-base font-semibold text-slate-900 dark:text-slate-100';
   const backTextClass = !canGoBack ? 'text-rose-600 dark:text-rose-400' : '';
   const nextTextClass = disableNext
      ? 'text-slate-500 dark:text-slate-400'
      : isLast
        ? 'text-rose-600 dark:text-rose-400'
        : '';

   const confirmExitTitle = 'Discard changes?';
   const confirmExitMessage = 'You have unsaved changes. Close without saving?';

   const handleExit = useCallback(() => {
      if (!hasUnsavedChanges) {
         onExit();
         return;
      }
      Keyboard.dismiss();
      Alert.alert(confirmExitTitle, confirmExitMessage, [
         { text: 'Cancel', style: 'cancel' },
         { text: 'Discard', style: 'destructive', onPress: () => onExit() },
      ]);
   }, [confirmExitMessage, confirmExitTitle, hasUnsavedChanges, onExit]);

   const handleBack = useCallback(() => {
      const wasFocused = inputRef?.current?.isFocused?.() ?? false;

      if (!canGoBack) {
         handleExit();
         return;
      }
      if (wasFocused) {
         Keyboard.dismiss();
      }
      if (onBack) {
         onBack();
      } else {
         setIdx((i) => Math.max(i - 1, 0));
      }
   }, [canGoBack, handleExit, inputRef, onBack, setIdx]);

   const handleNext = useCallback(() => {
      const isCurrentlyFocused = inputRef?.current?.isFocused?.() ?? false;

      if (isLast) {
         onSubmit();
         return;
      }
      if (onNext) {
         onNext();
      } else {
         setIdx((i) => Math.min(i + 1, totalSteps - 1));
      }

      if (isCurrentlyFocused) {
         // A minimal timeout ensures the cycle completes if the button stole focus
         setTimeout(() => inputRef?.current?.focus?.(), 0);
      }
   }, [inputRef, isLast, onNext, onSubmit, setIdx, totalSteps]);

   const bottomPadding = isKeyboardVisible ? 0 : insets.bottom;

   return (
      <View
         className="flex-row min-h-[48px] items-center px-4 gap-3"
         style={[{ paddingBottom: bottomPadding }, style]}
      >
         {/* Left Action (Back/Close) */}
         <View className="flex-1">
            <Pressable
               onPress={handleBack}
               hitSlop={12}
               className="items-center justify-center py-2.5 active:opacity-60"
            >
               {/* Conditional Color: Delete (Red) if Close, Text if Back */}
               <Text
                  className={`${baseTextClass} ${backTextClass}`}
               >
                  {backLabel}
               </Text>
            </Pressable>
         </View>

         {/* Divider */}
         <View className="w-[1px] self-stretch my-2 bg-slate-200 dark:bg-slate-700" />

         {/* Right Action (Next/Submit) */}
         <View className="flex-1">
            <Pressable
               onPress={handleNext}
               disabled={disableNext}
               hitSlop={12}
               className={`items-center justify-center py-2.5 ${disableNext ? 'opacity-40' : 'active:opacity-60'}`}
            >
               <Text
                  className={`${baseTextClass} ${nextTextClass}`}
               >
                  {nextLabel}
               </Text>
            </Pressable>
         </View>
      </View>
   );
}
