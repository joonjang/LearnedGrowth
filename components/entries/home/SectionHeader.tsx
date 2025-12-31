import { ChevronDown, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

export default function SectionHeader({
  title,
  rangeLabel,
  summary,
  isDark,
  paddingTop = 0,
}: Props) {
  const mood = getMoodConfig(summary.avgOptimism, isDark);
  const [expanded, setExpanded] = useState(false);

  const hasData = summary.avgOptimism !== null;

  const CONTENT_TOP_PADDING = 12;
  const HORIZONTAL_PADDING = 16;

  return (
    <View
      className="relative z-10 w-full border-b border-slate-200 bg-slate-50/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
      style={{ paddingTop }}
    >
      {/* 1. MAIN LAYOUT LAYER */}
      <View className="w-full flex-row items-start justify-between px-4 pt-3 pb-2">
        <View className="flex-1 pr-4">
          <Text className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {rangeLabel}
          </Text>
        </View>

        {/* GHOST PLACEHOLDER */}
        {hasData && (
          <View className="opacity-0 px-2.5 py-1.5 border border-transparent">
             <View className="flex-row gap-1.5">
                <mood.Icon size={14} />
                <Text className="text-[10px] font-bold">{mood.label}</Text>
                <ChevronDown size={12} />
             </View>
          </View>
        )}
      </View>

      {/* 2. CATEGORY LINE */}
      <View className="px-4">
        <SegmentedCategoryLine segments={summary.categorySegments} />
      </View>

      {/* 3. FLOATING INTERACTIVE LAYER */}
      {hasData && (
        <View 
            className="absolute z-50"
           style={{
               top: paddingTop + CONTENT_TOP_PADDING, 
               right: HORIZONTAL_PADDING 
           }}
       >
          <Pressable
             onPress={() => setExpanded(!expanded)}
              hitSlop={6}
             className="overflow-hidden rounded-xl border"
             style={{
                minWidth: 132,
                maxWidth: 220,
                backgroundColor: expanded 
                    ? (isDark ? '#1e293b' : '#ffffff') 
                    : 'transparent',
                 borderColor: expanded 
                    ? mood.color 
                    : (isDark ? '#334155' : '#e2e8f0'),
                 shadowColor: "#000",
                 shadowOffset: { width: 0, height: 4 },
                 shadowOpacity: expanded ? 0.1 : 0,
                 shadowRadius: 4,
                 elevation: expanded ? 4 : 0
              }}
           >
              {/* HEADER ROW: Right Aligned (matches ghost) */}
              <View className="flex-row items-center justify-end gap-1.5 px-2.5 py-1.5">
                 <mood.Icon size={14} color={mood.color} style={{ opacity: 0.9 }} />
                 
                 <Text 
                    className="text-[10px] font-bold uppercase tracking-wide" 
                    style={{ color: mood.color }}
                 >
                    {mood.label}
                 </Text>
                 
                 {expanded ? (
                    <X size={12} color={mood.color} style={{ opacity: 0.8 }} />
                 ) : (
                    <ChevronDown size={12} color={mood.color} style={{ opacity: 0.9 }} />
                )}
             </View>

              {/* DESCRIPTION: Left Aligned (Natural reading) */}
              {expanded && (
                 <View className="px-3 pb-2 pt-0.5 w-full">
                    <Text 
                       className="text-[11px] leading-4 text-left" 
                       style={{ color: isDark ? '#cbd5e1' : '#475569' }}
                    >
                       {mood.weekDescription ?? mood.description}
                    </Text>
                 </View>
              )}
           </Pressable>
        </View>
      )}
    </View>
  );
}
