import { Button, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
   canGoBack: boolean;
   isLast: boolean;
   onBack: () => void;
   onNext: () => void;
   disableNext?: boolean;
   style?: ViewStyle;
};

export default function StepperButton({
   canGoBack,
   isLast,
   onBack,
   onNext,
   disableNext,
   style,
}: Props) {
   return (
      <View style={[styles.container, style]}>
         <View style={styles.actionCol}>
            <Button
               title={!canGoBack ? 'Close' : 'Back'}
               onPress={onBack}
               color={!canGoBack ? 'red' : undefined}
            />
         </View>
         <View style={styles.divider} />
         <View style={styles.actionCol}>
            <Button
               title={isLast ? 'Finish' : 'Next'}
               onPress={onNext}
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
