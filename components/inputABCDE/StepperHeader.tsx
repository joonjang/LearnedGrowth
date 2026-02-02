import { Text, View, ViewStyle } from 'react-native';

type Props = {
   step: number;
   total: number;
   label: string;
   style?: ViewStyle;
};

export default function StepperHeader({ step, total, label, style }: Props) {
   return (
      <View 
         className="px-5 py-2"
         style={style}
      >
         <Text className="text-base font-medium text-slate-900 dark:text-slate-100">
            Step {step} of {total} — {label}
         </Text>
      </View>
   );
}
