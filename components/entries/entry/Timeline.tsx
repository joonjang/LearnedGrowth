import { getShadow } from '@/lib/shadow';
import { FieldTone, getFieldStyles } from '@/lib/theme';
import {
  Camera,
  MessageSquareText,
  SearchCheck,
  Sun,
  TriangleAlert,
  Zap
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

const getIconColor = (tone: FieldTone) => {
  switch (tone) {
    case 'belief': return '#9a3412'; // orange-800
    case 'dispute': return '#3730a3'; // indigo-800
    case 'energy': return '#065f46'; // emerald-800
    default: return '#64748b'; // slate-500
  }
};

// --- Component: TimelineItem ---
export function TimelineItem({ 
  step, 
  children, 
  variant = 'default',
  isLast = false 
}: { 
  step: TimelineStepDef; 
  children?: React.ReactNode; 
  variant?: TimelineVariant;
  isLast?: boolean 
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const shadow = useMemo(() => getShadow({ isDark, preset: 'sm' }), [isDark]);
  const styles = getFieldStyles(step.tone, false);
  const Icon = step.icon || ICON_MAP[step.key] || Camera;
  const iconColor = getIconColor(step.tone);
  const isFull = variant === 'full';

  const getCardBackground = () => {
    if (step.tone === 'default' || step.tone === 'neutral') {
      return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
    }
    return `${styles.container}`;
  };

  const cardBgClass = getCardBackground();

  if (isFull) {
    return (
      <View className="mb-4">
        <View
          className={`rounded-2xl border px-5 py-4 ${cardBgClass} ${shadow.className}`}
          style={[shadow.ios, shadow.android]}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
               <Text className={`text-base font-bold ${styles.text}`}>
                  {step.label}
               </Text>
            </View>
            <View className="rounded-full px-2 py-1">
               <Icon size={14} color={iconColor} strokeWidth={2.5} />
            </View>
          </View>
          
          <Text className="text-sm font-medium mb-3 opacity-80 text-slate-700 dark:text-slate-300">
             {step.desc}
          </Text>

          <View>{children}</View>
        </View>
      </View>
    );
  }

  const getNodeStyles = () => {
    switch (step.tone) {
      case 'belief': return 'bg-belief-bg dark:bg-belief-bgDark border-belief-border dark:border-belief-borderDark text-belief-text dark:text-belief-textDark';
      case 'dispute': return 'bg-dispute-bg dark:bg-dispute-bgDark border-dispute-border dark:border-dispute-borderDark text-dispute-text dark:text-dispute-textDark';
      case 'energy': return 'bg-energy-bg dark:bg-energy-bgDark border-energy-border dark:border-energy-borderDark text-energy-text dark:text-energy-textDark';
      default: return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
    }
  };
  const nodeClass = getNodeStyles();

  return (
    <View className="flex-row items-start relative z-10">
      <View
        className={`z-10 h-10 w-10 items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${nodeClass}`}
      >
        <Text className={`text-sm font-black ${nodeClass.split(' ').pop()}`}>
          {step.letter}
        </Text>
      </View>

      <View className={`ml-4 flex-1 pt-1 ${!isLast ? 'pb-8' : ''}`}>
        <View
          className={`rounded-2xl border p-4 ${cardBgClass} ${shadow.className}`}
          style={[shadow.ios, shadow.android]}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className={`text-base font-bold ${styles.text}`}>
              {step.label}
            </Text>
            <View className="rounded-full px-2 py-1">
              <Icon size={14} color={iconColor} strokeWidth={2.5} />
            </View>
          </View>

          <Text className="text-sm leading-5 mb-3 opacity-80 text-slate-700 dark:text-slate-300">
             {step.desc}
          </Text>

          <View>{children}</View>
        </View>
      </View>
    </View>
  );
}

// --- Component: TimelinePivot ---
export function TimelinePivot({ 
    children, 
    variant = 'default' 
}: { 
    children: React.ReactNode; 
    variant?: TimelineVariant 
}) {
  const isFull = variant === 'full';

  if (isFull) {
      return (
          <View className="mb-6 mt-2">
             <View className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
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
        <View className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          {children}
        </View>
      </View>
    </View>
  );
}

// --- Component: TimelineLine ---
export function TimelineLine() {
  return (
    <View 
      pointerEvents="none" 
      // UPDATED: bottom-12 makes the line shorter (ending ~48px from the bottom)
      // left-6 is the offset, w-10 is the wrapper width, items-center centers the line inside
      className="absolute left-6 top-6 bottom-12 w-10 items-center z-0"
    >
        {/* Vertical Line */}
        <View className="h-full w-[2px] bg-slate-200 dark:bg-slate-800 relative">
             {/* The "Period" / Dot at the end */}
             <View 
                className="absolute -bottom-1 rounded-full bg-slate-300 dark:bg-slate-700" 
                style={{ width: 8, height: 8, left: -3 }}
             />
        </View>
    </View>
  );
}
