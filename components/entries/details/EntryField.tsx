// components/entries/details/EntryField.tsx

import {
   TimelineItem,
   TimelineStepDef,
} from '@/components/entries/details/Timeline';
import {
   ENTRY_CHAR_LIMITS,
   ENTRY_CHAR_WARN_MIN_REMAINING,
   ENTRY_CHAR_WARN_RATIO,
} from '@/lib/constants';
import React, { memo } from 'react';
import { Text, TextInput, View } from 'react-native';

type EntryFieldProps = {
   step: TimelineStepDef;
   value: string;
   isEditing: boolean;
   isDark: boolean;
   onChangeText: (key: string, val: string) => void;
   children?: React.ReactNode; // For the Pivot/Next buttons
};

const getCharCountMeta = (value: string, limit: number) => {
   const remaining = limit - value.length;
   const warnThreshold = Math.max(
      ENTRY_CHAR_WARN_MIN_REMAINING,
      Math.round(limit * ENTRY_CHAR_WARN_RATIO),
   );
   return { remaining, show: remaining <= warnThreshold };
};

export const EntryField = memo(
   ({
      step,
      value,
      isEditing,
      isDark,
      onChangeText,
      children,
   }: EntryFieldProps) => {
      const effectiveValue = value === 'Empty' ? '' : value;
      const charLimit =
         ENTRY_CHAR_LIMITS[step.key as keyof typeof ENTRY_CHAR_LIMITS];
      const charMeta = getCharCountMeta(effectiveValue, charLimit);

      // Styles
      const isNeutral = step.tone === 'default' || step.tone === 'neutral';
      const readOnlyBg = isNeutral
         ? 'bg-slate-50 dark:bg-slate-800'
         : 'bg-white/60 dark:bg-black/10';
      const finalBg = isEditing
         ? 'bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800'
         : readOnlyBg;
      const counterClassName =
         charMeta.remaining <= 0
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-amber-600 dark:text-amber-400';

      return (
         <View>
            <TimelineItem step={step} variant="full">
               {isEditing ? (
                  <View>
                     <TextInput
                        multiline
                        value={effectiveValue}
                        onChangeText={(txt) => onChangeText(step.key, txt)}
                        placeholder={`Write your ${step.label.toLowerCase()} here...`}
                        placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                        className={`min-h-[36px] rounded-lg px-3 py-1 text-sm leading-6 ${finalBg} text-slate-900 dark:text-slate-100`}
                        scrollEnabled={false}
                        textAlignVertical="top"
                        autoCorrect
                        maxLength={charLimit}
                     />
                     {charMeta.show && (
                        <View className="mt-1 flex-row justify-end">
                           <Text
                              className={`text-[11px] font-medium ${counterClassName}`}
                           >
                              {effectiveValue.length}/{charLimit}
                           </Text>
                        </View>
                     )}
                  </View>
               ) : (
                  <View
                     className={`min-h-[36px] rounded-lg px-3 py-2 ${finalBg}`}
                  >
                     <Text
                        className={`text-sm leading-6 text-slate-900 dark:text-slate-100`}
                     >
                        {effectiveValue || (
                           <Text className="italic opacity-50">Empty</Text>
                        )}
                     </Text>
                  </View>
               )}
            </TimelineItem>
            {children}
         </View>
      );
   },
);

EntryField.displayName = 'EntryField';
