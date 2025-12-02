import React, { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import {
   Alert,
   Button,
   Keyboard,
   StyleSheet,
   View,
   ViewStyle,
} from 'react-native';

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
   const isLast = useMemo(() => idx === totalSteps - 1, [idx, totalSteps]);
   const canGoBack = useMemo(() => idx > 0, [idx]);

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
      <View style={[styles.container, style]}>
         <View style={styles.actionCol}>
            <Button
               title={!canGoBack ? 'Close' : 'Back'}
               onPress={handleBack}
               color={!canGoBack ? 'red' : undefined}
            />
         </View>
         <View style={styles.divider} />
         <View style={styles.actionCol}>
            <Button
               title={isLast ? 'Submit' : 'Next'}
               onPress={handleNext}
               disabled={disableNext}
               color={isLast ? 'red' : undefined}
            />
         </View>
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flexDirection: 'row',
      minHeight: 48,
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 12,
   },
   divider: {
      width: 1,
      marginVertical: 8,
      alignSelf: 'stretch',
      backgroundColor: '#e5e5e5',
   },
   actionCol: { flex: 1 },
});
