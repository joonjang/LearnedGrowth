import { PInsightCard } from '@/components/appInfo/PDefinitions';
import GradientSpectrumBar from '@/components/entries/home/GradientSpectrumBar';
import { DashboardData } from '@/components/entries/home/types';
import { getMoodConfig } from '@/components/entries/home/utils';
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';

type Props = {
  data: DashboardData;
  shadowSm: any;
  isDark: boolean;
};

const GlobalDashboard = React.memo(({ data, shadowSm, isDark }: Props) => {
  const [showHelp, setShowHelp] = useState(false);

  if (data.last7DaysScore === null) return null;

  const mood = getMoodConfig(data.last7DaysScore, isDark);

  const toggleHelp = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHelp((prev) => !prev);
  };

  return (
    <View className="gap-4">
      {/* 1. MOOD SUMMARY CARD (Unchanged) */}
      <View
        className={`p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 ${shadowSm.className}`}
        style={[shadowSm.ios, shadowSm.android]}
      >
        <View className="flex-row items-center gap-2 mb-4">
          <Activity size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
          <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Summary
          </Text>
        </View>

        <View className="flex-row items-start gap-4">
          <View
            className="h-14 w-14 rounded-full items-center justify-center"
            style={{ backgroundColor: mood.bg }}
          >
            <mood.Icon size={32} color={mood.color} />
          </View>

          <View className="flex-1 pt-1">
            <Text className="text-xl font-bold mb-1" style={{ color: mood.color }}>
              {mood.label}
            </Text>
            <Text className="text-sm text-slate-600 dark:text-slate-300 leading-5">
              {mood.description}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. THINKING PATTERNS CARD */}
      {data.threePs && (
        <View
          className={`p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 ${shadowSm.className}`}
          style={[shadowSm.ios, shadowSm.android]}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Layers size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Thinking Patterns
              </Text>
            </View>

            {/* FIX: Pressable wraps a styled View to avoid NativeWind bug */}
            <Pressable onPress={toggleHelp}>
              <View 
                className={`flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors ${
                   showHelp 
                     ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600' 
                     : 'border-transparent'
                }`}
              >
                <BookOpen size={12} color={isDark ? '#94a3b8' : '#64748b'} />
                <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Guide
                </Text>
                {showHelp ? (
                  <ChevronUp size={12} color={isDark ? '#94a3b8' : '#64748b'} />
                ) : (
                  <ChevronDown size={12} color={isDark ? '#94a3b8' : '#64748b'} />
                )}
              </View>
            </Pressable>
          </View>

          {/* Expanded Content */}
          {showHelp && (
             <View className="mb-4">
               <PInsightCard context="week" />
             </View>
          )}

          <View className="gap-6">
            <GradientSpectrumBar
              label="Time"
              subLabel="(Permanence)"
              leftLabel="Temporary"
              rightLabel="Permanent"
              optimisticPercentage={data.threePs.permanence.score}
              isDark={isDark}
            />
            <GradientSpectrumBar
              label="Scope"
              subLabel="(Pervasiveness)"
              leftLabel="Specific"
              rightLabel="Pervasive"
              optimisticPercentage={data.threePs.pervasiveness.score}
              isDark={isDark}
            />
            <GradientSpectrumBar
              label="Blame"
              subLabel="(Personalization)"
              leftLabel="External"
              rightLabel="Internal"
              optimisticPercentage={data.threePs.personalization.score}
              isDark={isDark}
            />
          </View>
        </View>
      )}
    </View>
  );
});

GlobalDashboard.displayName = 'GlobalDashboard';
export default GlobalDashboard;