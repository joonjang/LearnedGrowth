import { ChevronDown } from 'lucide-react-native';
import { View } from 'react-native';
import { CHEVRON_ICON_DARK, CHEVRON_ICON_LIGHT } from '../constants';

export default function HelperFooter({ isDark }: { isDark: boolean }) {
   const chevronColor = isDark ? CHEVRON_ICON_DARK : CHEVRON_ICON_LIGHT;
   return (
      <View className="mx-5 flex-row items-center justify-center gap-2 opacity-80">
         <ChevronDown size={16} color={chevronColor} />
      </View>
   );
}
