import { StyleSheet, Text, View, ViewStyle } from 'react-native';

type Props = {
   step: number;
   total: number;
   label: string;
   style?: ViewStyle;
};

export default function StepperHeader({ step, total, label, style }: Props) {
   return (
      <View style={[styles.container, style]}>
         <Text style={styles.text}>
            Step {step} of {total} — {label}
         </Text>
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      paddingHorizontal: 20,
      paddingVertical: 8,
   },
   text: { fontSize: 16, fontWeight: '500' },
});
