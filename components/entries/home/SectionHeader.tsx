import React from 'react';
import { Text, View } from 'react-native';
import SegmentedCategoryLine from './SegmentedCategoryLine';
import { WeekSummary } from './types';
import { getMoodConfig } from './utils';

type Props = {
  title: string;
  rangeLabel: string;
  summary: WeekSummary;
  isDark: boolean;
  paddingTop?: number;
};

export default function SectionHeader({ title, rangeLabel, summary, isDark, paddingTop = 0 }: Props) {
  const mood = getMoodConfig(summary.avgOptimism, isDark);

  return (
    <View
      pointerEvents="box-none"
      className="w-full bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800"
      style={{ paddingTop }}
    >
      <View className="flex-row items-baseline justify-between w-full px-4 pt-3 pb-2">
        <View className="flex-1 pr-2">
          <Text className="text-base font-bold text-slate-900 dark:text-white">{title}</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">{rangeLabel}</Text>
        </View>

        {summary.avgOptimism !== null && (
          <View className="items-end">
            <View className="flex-row items-center gap-1.5">
              <mood.Icon size={14} color={isDark ? '#94a3b8' : '#64748b'} />
              <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {mood.label}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="px-4">
        <SegmentedCategoryLine segments={summary.categorySegments} />
      </View>
    </View>
  );
}
