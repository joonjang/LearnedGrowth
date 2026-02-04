import { ICON_COLOR_DARK, ICON_COLOR_LIGHT } from '@/lib/styles';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';

type Props = {
   isDark: boolean;
   onPress?: () => void;
};

export default function LeftBackChevron({ isDark, onPress }: Props) {
   const iconColor = isDark ? ICON_COLOR_DARK : ICON_COLOR_LIGHT;

   const handlePress = () => {
      if (onPress) {
         onPress();
      } else {
         router.back();
      }
   };

   return (
      <Pressable
         onPress={handlePress}
         hitSlop={12}
         className="p-3 -ml-3 rounded-full active:bg-slate-200/50 dark:active:bg-slate-800/50 self-start"
      >
         <ChevronLeft size={24} strokeWidth={2.5} color={iconColor} />
      </Pressable>
   );
}
