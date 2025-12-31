import GradientSpectrumBar from '@/components/entries/home/GradientSpectrumBar';
import { DashboardData } from '@/components/entries/home/types';
import { getMoodConfig } from '@/components/entries/home/utils';
import {
  Activity,
  HelpCircle,
  Layers,
  X,
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

  if (data.last7DaysScore === null) {
    return (
      <View className="py-8 items-center justify-center">
        <Text className="text-slate-400 text-sm text-center">
          Add entries to unlock 7-day insights.
        </Text>
      </View>
    );
  }

  const mood = getMoodConfig(data.last7DaysScore, isDark);
  const toggleHelp = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHelp((prev) => !prev);
  };

  return (
    <View className="gap-4">
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

      {data.threePs && (
        <View
          className={`p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 ${shadowSm.className}`}
          style={[shadowSm.ios, shadowSm.android]}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Layers size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Thinking Patterns (The 3 P&apos;s)
              </Text>
            </View>

            <Pressable
              onPress={toggleHelp}
              hitSlop={10}
              className="active:opacity-60"
            >
              {showHelp ? (
                <X size={18} color={isDark ? '#94a3b8' : '#64748b'} />
              ) : (
                <HelpCircle size={18} color={isDark ? '#94a3b8' : '#64748b'} />
              )}
            </Pressable>
          </View>

          {showHelp && (
            <View className="mb-6 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 gap-3">
              <View>
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                  Time (Permanence)
                </Text>
                <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                  Do you see problems as temporary setbacks or forever flaws?
                </Text>
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                  Scope (Pervasiveness)
                </Text>
                <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                  Do problems ruin everything or just one specific area?
                </Text>
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                  Blame (Personalization)
                </Text>
                <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                  Do you blame yourself entirely or consider the situation?
                </Text>
              </View>
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
