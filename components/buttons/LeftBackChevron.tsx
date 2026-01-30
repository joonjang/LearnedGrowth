import { ICON_COLOR_DARK, ICON_COLOR_LIGHT } from '@/lib/styles';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';

type Props = {
   isDark: boolean;
};

export default function LeftBackChevron({ isDark }: Props) {
   const iconColor = isDark ? ICON_COLOR_DARK : ICON_COLOR_LIGHT;

   return (
      <Pressable
         onPress={() => router.back()}
         hitSlop={12}
         className="p-2 -ml-2 rounded-full active:bg-slate-200/50 dark:active:bg-slate-800/50 self-start mt-1"
      >
         <ChevronLeft size={24} strokeWidth={2.5} color={iconColor} />
      </Pressable>
   );
}
