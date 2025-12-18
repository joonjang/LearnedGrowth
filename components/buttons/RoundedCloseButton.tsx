import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { Pressable } from 'react-native';

type Props = {
   onPress: () => void;
};

export default function RoundedCloseButton({ onPress: handleClose}: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#f8fafc' : '#0f172a'; // text vs text-inverse

   return (
      <Pressable
         onPress={handleClose}
         hitSlop={12}
         className="p-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 items-center justify-center active:opacity-70"
      >
         <Ionicons name="close" size={22} color={iconColor} />
      </Pressable>
   );
}
