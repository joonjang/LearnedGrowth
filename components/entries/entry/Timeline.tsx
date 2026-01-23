import { getShadow } from '@/lib/shadow';
import { FieldTone, getFieldStyles } from '@/lib/theme';
import {
   Camera,
   MessageSquareText,
   SearchCheck,
   Sun,
   TriangleAlert,
   Zap,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

// --- Types ---
export type TimelineVariant = 'default' | 'full';

export interface TimelineStepDef {
   key: string;
   letter: string;
   label: string;
   desc: string;
   tone: FieldTone;
   icon?: React.ElementType;
}

// --- Constants ---
const ICON_MAP: Record<string, React.ElementType> = {
   adversity: TriangleAlert,
   belief: MessageSquareText,
   consequence: Zap,
   dispute: SearchCheck,
   energy: Sun,
};

const getIconColor = (tone: FieldTone, isDark: boolean) => {
   switch (tone) {
      case 'belief':
         return isDark ? '#fdba74' : '#9a3412'; // orange-300 / orange-800
      case 'dispute':
         return isDark ? '#6ee7b7' : '#3730a3'; // emerald-300 / indigo-800
      case 'energy':
         return isDark ? '#7dd3fc' : '#065f46'; // sky-300 / emerald-800
      default:
         return isDark ? '#cbd5e1' : '#64748b'; // slate-300 / slate-500
   }
};

// --- Component: TimelineItem ---
export function TimelineItem({
   step,
   children,
   variant = 'default',
   isLast = false,
}: {
   step: TimelineStepDef;
   children?: React.ReactNode;
   variant?: TimelineVariant;
   isLast?: boolean;
}) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const shadow = useMemo(() => getShadow({ isDark, preset: 'sm' }), [isDark]);
   const styles = getFieldStyles(step.tone, false);
   const Icon = step.icon || ICON_MAP[step.key] || Camera;
   const iconColor = getIconColor(step.tone, isDark);
   const isFull = variant === 'full';

   const getCardBackground = () => {
      if (step.tone === 'default' || step.tone === 'neutral') {
         return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600';
      }
      return `${styles.container}`;
   };

   const cardBgClass = getCardBackground();

   if (isFull) {
      return (
         <View className="mb-4">
            <View
               className={`rounded-2xl border px-5 py-4 ${cardBgClass}`}
               style={[shadow.ios, shadow.android]}
            >
               <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1 flex-row items-center mr-3 overflow-hidden">
                     {/* Label */}
                     <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500">
                        {step.label}
                     </Text>

                     {/* Divider */}
                     <Text className="text-[10px] text-slate-300 dark:text-slate-600 mx-2">
                        |
                     </Text>

                     {/* Description (Primary Color) */}
                     {/* Reverted to ${styles.text} for dynamic coloring */}
                     <Text
                        className={`text-sm font-semibold ${styles.text} flex-1`}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                     >
                        {step.desc}
                     </Text>
                  </View>

                  <View className="rounded-full pl-2">
                     <Icon size={16} color={iconColor} strokeWidth={2.5} />
                  </View>
               </View>
               <View>{children}</View>
            </View>
         </View>
      );
   }

   const getNodeStyles = () => {
      switch (step.tone) {
         case 'belief':
            return 'bg-belief-bg dark:bg-belief-bgDark border-belief-border dark:border-belief-borderDark text-belief-text dark:text-belief-textDark';
         case 'dispute':
            return 'bg-dispute-bg dark:bg-dispute-bgDark border-dispute-border dark:border-dispute-borderDark text-dispute-text dark:text-dispute-textDark';
         case 'energy':
            return 'bg-energy-bg dark:bg-energy-bgDark border-energy-border dark:border-energy-borderDark text-energy-text dark:text-energy-textDark';
         default:
            return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
      }
   };
   const nodeClass = getNodeStyles();

   return (
      <View className="flex-row items-start relative z-10">
         <View
            className={`z-10 h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-950 ${nodeClass}`}
         >
            <Text
               className={`text-sm font-black ${nodeClass.split(' ').pop()}`}
            >
               {step.letter}
            </Text>
         </View>

         <View className={`ml-4 flex-1 pt-1 ${!isLast ? 'pb-8' : ''}`}>
            <View
               className={`rounded-2xl border p-4 ${cardBgClass}`}
               style={[shadow.ios, shadow.android]}
            >
               <View className="flex-row items-start justify-between mb-3">
                  {/* Text Container (Stacked) */}
                  <View className="flex-1 mr-3">
                     {/* Label */}
                     <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500 mb-0.5">
                        {step.label}
                     </Text>

                     {/* Description (Primary Color) */}
                     {/* Reverted to ${styles.text} for dynamic coloring */}
                     <Text className={`text-sm font-semibold ${styles.text}`}>
                        {step.desc}
                     </Text>
                  </View>

                  {/* Icon (Top Right) */}
                  <View className="rounded-full pl-2 pt-1">
                     <Icon size={16} color={iconColor} strokeWidth={2.5} />
                  </View>
               </View>
               <View>{children}</View>
            </View>
         </View>
      </View>
   );
}

export function TimelinePivot({
   children,
   variant = 'default',
   bgClassName, // New: Override background color
   borderClassName, // New: Override border color
}: {
   children: React.ReactNode;
   variant?: TimelineVariant;
   bgClassName?: string;
   borderClassName?: string;
}) {
   const isFull = variant === 'full';

   // Defaults (Gray Slate)
   const defaultBg = 'bg-slate-50/50 dark:bg-slate-900/50';
   const defaultBorder = 'border-slate-300 dark:border-slate-500';

   // Final Classes (Merge provided props or use defaults)
   const finalBg = bgClassName || defaultBg;
   const finalBorder = borderClassName || defaultBorder;

   if (isFull) {
      return (
         <View className="mb-6 mt-2">
            <View
               className={`rounded-2xl border-2 border-dashed p-4 ${finalBorder} ${finalBg}`}
            >
               {children}
            </View>
         </View>
      );
   }

   return (
      <View className="flex-row items-start pb-8 relative z-10">
         <View className="z-10 relative h-10 w-10 items-center justify-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950">
               <View className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
            </View>
         </View>

         <View className="ml-4 flex-1 pt-1">
            <View
               className={`rounded-2xl border-2 border-dashed p-4 ${finalBorder} ${finalBg}`}
            >
               {children}
            </View>
         </View>
      </View>
   );
}

export function TimelineLine() {
   return (
      <View
         pointerEvents="none"
         className="absolute left-6 top-6 bottom-12 w-10 items-center z-0"
      >
         <View className="h-full w-[2px] bg-slate-200 dark:bg-slate-800 relative">
            <View
               className="absolute -bottom-1 rounded-full bg-slate-300 dark:bg-slate-700"
               style={{ width: 8, height: 8, left: -3 }}
            />
         </View>
      </View>
   );
}
