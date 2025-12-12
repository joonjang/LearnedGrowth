import React, { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import {
   Alert,
   Keyboard,
   Pressable,
   Text,
   View,
   ViewStyle,
} from 'react-native';
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
}: Props) {
   
   // Logic
   const isLast = useMemo(() => idx === totalSteps - 1, [idx, totalSteps]);
   const canGoBack = useMemo(() => idx > 0, [idx]);
   const backLabel = !canGoBack ? 'Close' : 'Back';
   const nextLabel = isLast ? 'Submit' : 'Next';

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
      if (!canGoBack) {
         handleExit();
         return;
      }
      setIdx((i) => Math.max(i - 1, 0));
   }, [canGoBack, handleExit, setIdx]);

   const handleNext = useCallback(() => {
      if (isLast) {
         onSubmit();
         return;
      }
      setIdx((i) => Math.min(i + 1, totalSteps - 1));
   }, [isLast, onSubmit, setIdx, totalSteps]);

   return (
      <View 
         className="flex-row min-h-[48px] items-center px-4 gap-3 bg-card-bg"
         style={style}
      >
         {/* Left Action (Back/Close) */}
         <View className="flex-1">
            <Pressable
               onPress={handleBack}
               hitSlop={12}
               className="items-center justify-center py-2.5 active:opacity-60"
            >
               {/* Conditional Color: Delete (Red) if Close, Text if Back */}
               <Text className={`text-base font-semibold ${!canGoBack ? 'text-delete' : 'text-text'}`}>
                  {backLabel}
               </Text>
            </Pressable>
         </View>

         {/* Divider */}
         <View className="w-[1px] self-stretch my-2 bg-border" />

         {/* Right Action (Next/Submit) */}
         <View className="flex-1">
            <Pressable
               onPress={handleNext}
               disabled={disableNext}
               hitSlop={12}
               className={`items-center justify-center py-2.5 ${disableNext ? 'opacity-40' : 'active:opacity-60'}`}
            >
               <Text className={`text-base font-semibold ${disableNext ? 'text-hint' : 'text-text'}`}>
                  {nextLabel}
               </Text>
            </Pressable>
         </View>
      </View>
   );
}