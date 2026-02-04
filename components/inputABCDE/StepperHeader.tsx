import { Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
   step: number;
   total: number;
   label: string;
   style?: ViewStyle;
};

export default function StepperHeader({ step, total, label, style }: Props) {
   const { t } = useTranslation();
   return (
      <View 
         className="px-5 py-2"
         style={style}
      >
         <Text className="text-base font-medium text-slate-900 dark:text-slate-100">
            {t('common.step_of', { step, total, label })}
         </Text>
      </View>
   );
}
