import { makeThemedStyles, useTheme } from '@/theme/theme';
import React, { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import {
   Alert,
   Keyboard,
   Pressable,
   StyleSheet,
   Text,
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
   const { colors } = useTheme();
   const styles = useStyles();
   const isLast = useMemo(() => idx === totalSteps - 1, [idx, totalSteps]);
   const canGoBack = useMemo(() => idx > 0, [idx]);
   const backLabel = !canGoBack ? 'Close' : 'Back';
   const nextLabel = isLast ? 'Submit' : 'Next';
   const backColor = !canGoBack ? colors.delete : colors.text;
   const nextColor = disableNext ? colors.hint : colors.text;

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
            <Pressable
               onPress={handleBack}
               hitSlop={12}
               style={({ pressed }) => [
                  styles.pressable,
                  pressed && styles.pressed,
               ]}
            >
               <Text style={[styles.text, { color: backColor }]}>
                  {backLabel}
               </Text>
            </Pressable>
         </View>
         <View style={styles.divider} />
         <View style={styles.actionCol}>
            <Pressable
               onPress={handleNext}
               disabled={disableNext}
               hitSlop={12}
               style={({ pressed }) => [
                  styles.pressable,
                  pressed && !disableNext ? styles.pressed : null,
                  disableNext ? styles.disabled : null,
               ]}
            >
               <Text
                  style={[
                     styles.text,
                     { color: nextColor },
                     disableNext ? styles.textDisabled : null,
                  ]}
               >
                  {nextLabel}
               </Text>
            </Pressable>
         </View>
      </View>
   );
}

const useStyles = makeThemedStyles(({ colors }) =>
   StyleSheet.create({
      container: {
         flexDirection: 'row',
         minHeight: 48,
         alignItems: 'center',
         paddingHorizontal: 16,
         gap: 12,
         backgroundColor: colors.cardBg,
      },
      divider: {
         width: 1,
         marginVertical: 8,
         alignSelf: 'stretch',
         backgroundColor: colors.border,
      },
      actionCol: { flex: 1 },
      pressable: {
         alignItems: 'center',
         justifyContent: 'center',
         paddingVertical: 10,
      },
      pressed: { opacity: 0.6 },
      text: {
         fontSize: 16,
         fontWeight: '600',
      },
      disabled: { opacity: 0.4 },
      textDisabled: { color: colors.hint },
   })
);
