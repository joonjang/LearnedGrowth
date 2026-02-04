import {
   DISPUTE_BG_CLASS,
   DISPUTE_BORDER_CLASS,
   DISPUTE_TEXT_CLASS,
   SEMANTIC_COLORS,
} from '@/lib/styles';
import { getShadow } from '@/lib/shadow';
import type { LucideIcon } from 'lucide-react-native';
import { Pencil } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

type Props = {
   onPress: () => void;
   label?: string;
   className?: string;
   textClassName?: string;
   icon?: LucideIcon;
};

export default function NewDisputeLink({
   onPress,
   label,
   className,
   textClassName,
   icon,
}: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { t } = useTranslation();
   const shadow = useMemo(
      () => getShadow({ isDark, preset: 'button' }),
      [isDark],
   );
   const Icon = icon ?? Pencil;
   const iconColor = isDark
      ? SEMANTIC_COLORS.dispute.ctaDark
      : SEMANTIC_COLORS.dispute.cta;

   return (
      <Pressable
         onPress={onPress}
         hitSlop={10}
         accessibilityRole="button"
         className={`
            flex-row items-center relative h-14 justify-center
            px-5 rounded-2xl w-full
            border ${DISPUTE_BORDER_CLASS}
            ${DISPUTE_BG_CLASS}
            active:opacity-90 active:scale-[0.99]
            ${className ?? ''}
         `}
         style={[shadow.ios, shadow.android]}
      >
         <Text
         className={`text-[15px] font-bold text-center w-full ${DISPUTE_TEXT_CLASS} ${textClassName ?? ''}`}
         >
            {label ?? t('dispute.new_dispute')}
         </Text>
         <View className="absolute right-5">
            <Icon size={18} color={iconColor} />
         </View>
      </Pressable>
   );
}
