import { getShadow } from '@/lib/shadow';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

type Props = {
   label?: string;
   subLabel?: string;
   leftLabel: string;
   rightLabel: string;
   optimisticPercentage: number;
   isDark: boolean;
};

const GradientSpectrumBar = React.memo(
   ({
      label,
      subLabel,
      leftLabel,
      rightLabel,
      optimisticPercentage,
      isDark,
   }: Props) => {
      const position = Math.max(0, Math.min(100, 100 - optimisticPercentage));

      const green = isDark ? '#059669' : '#34d399';
      const mid = isDark ? '#475569' : '#cbd5e1';
      const red = isDark ? '#be123c' : '#f43f5e';

      const textColor = isDark ? '#e2e8f0' : '#334155';
      const trackBg = isDark ? '#1e293b' : '#f1f5f9';
      const markerColor = isDark ? '#ffffff' : '#0f172a';

      const markerShadow = useMemo(
         () => getShadow({ isDark, preset: 'sm' }),
         [isDark],
      );

      return (
         <View>
            {label && (
               <View className="flex-row items-baseline gap-2 mb-1">
                  <Text
                     className="text-[13px] font-semibold"
                     style={{ color: textColor }}
                  >
                     {label}
                  </Text>
                  <Text className="text-xs text-slate-400 dark:text-slate-500">
                     {subLabel}
                  </Text>
               </View>
            )}

            <View className="relative">
               <View
                  className="h-2.5 w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: trackBg }}
               >
                  <LinearGradient
                     colors={[green, mid, red]}
                     start={{ x: 0, y: 0.5 }}
                     end={{ x: 1, y: 0.5 }}
                     style={{ flex: 1, opacity: 0.3 }}
                  />
               </View>

               <View
                  style={[
                     markerShadow.ios,
                     markerShadow.android,
                     {
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: 9,
                        backgroundColor: markerColor,
                        left: `${position}%`,
                        transform: [{ translateX: -6 }],
                        borderRadius: 999,
                     },
                  ]}
               />
            </View>

            <View className="flex-row justify-between mt-1">
               <Text
                  className="text-[9px] font-semibold"
                  style={{ color: isDark ? '#34d399' : '#059669' }}
               >
                  {leftLabel}
               </Text>
               <Text
                  className="text-[9px] font-semibold"
                  style={{ color: isDark ? '#f43f5e' : '#e11d48' }}
               >
                  {rightLabel}
               </Text>
            </View>
         </View>
      );
   },
);

GradientSpectrumBar.displayName = 'GradientSpectrumBar';
export default GradientSpectrumBar;
