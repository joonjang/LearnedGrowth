import { ABCDE_FIELD } from '@/components/constants';
import { Link } from 'expo-router';
import {
    ArrowRight,
    BookOpen,
    Camera,
    CloudRainWind,
    MessageSquareText,
    RefreshCw,
    SearchCheck,
    Sun,
    TriangleAlert,
    Zap,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    Animated,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StepTone = 'neutral' | 'belief' | 'dispute' | 'energy';

type StepDefinition = {
  key: string;
  letter: string;
  label: string;
  desc: string;
  tone: StepTone;
  icon: React.ElementType;
};

const STEP_META: Record<string, { tone: StepTone; icon: React.ElementType }> = {
  adversity: { tone: 'neutral', icon: TriangleAlert },
  belief: { tone: 'belief', icon: MessageSquareText },
  consequence: { tone: 'neutral', icon: CloudRainWind },
  dispute: { tone: 'dispute', icon: SearchCheck },
  energy: { tone: 'energy', icon: Sun },
};

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

const SCENARIOS = [
  {
    id: 'work',
    label: 'Work Stress',
    examples: {
      adversity: 'I sent a report with a typo in the title.',
      belief: 'They’ll think I’m careless.',
      consequence: 'I felt anxious and avoided checking replies.',
      dispute:
        'One typo isn’t my whole track record. I can send a quick correction.',
      energy: 'More steady. I fixed it and moved on.',
    },
  },
  {
    id: 'social',
    label: 'Social Anxiety',
    examples: {
      adversity: 'I texted a friend and didn’t hear back for a few hours.',
      belief: 'They’re annoyed with me.',
      consequence: 'I felt tense and avoided checking replies.',
      dispute: 'They might be busy. A late reply does not equal rejection.',
      energy: 'Calmer. I put my phone down and did something else.',
    },
  },
  {
    id: 'internal',
    label: 'Self Criticism',
    examples: {
      adversity: 'I overslept and missed the gym.',
      belief: 'I have no discipline.',
      consequence: 'I felt ashamed and acted like the day was “ruined.”',
      dispute: 'One missed session does not erase progress. I can reset today.',
      energy: 'Kinder to myself. I planned a simple workout for tomorrow.',
    },
  },
];

export default function QuickStartScreen() {
  const insets = useSafeAreaInsets();
  const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const activeScenario = SCENARIOS[activeScenarioIndex];

  const steps: StepDefinition[] = useMemo(() => {
    return ABCDE_FIELD.map((f, idx) => ({
      key: f.key,
      letter: LETTERS[idx] ?? '',
      label: f.label,
      desc: f.hint,
      tone: STEP_META[f.key]?.tone ?? 'neutral',
      icon: STEP_META[f.key]?.icon ?? Camera,
    }));
  }, []);

  // Fade animation for scenario changes (no LayoutAnimation)
  const fade = useRef(new Animated.Value(1)).current;

  // Line geometry computed from onLayout (no measureLayout)
  const NODE_SIZE = 40; // h-10 / w-10
  const LINE_TAIL = 14;

  const [stepsLayout, setStepsLayout] = useState<{ y: number; height: number } | null>(null);
  const [adversityRowY, setAdversityRowY] = useState<number | null>(null);

  const lineGeom = useMemo(() => {
    if (!stepsLayout || adversityRowY == null) return null;

    const top = stepsLayout.y + adversityRowY + NODE_SIZE / 2;
    const bottom = stepsLayout.y + stepsLayout.height + LINE_TAIL;
    const height = Math.max(0, bottom - top);

    return { top, height };
  }, [stepsLayout, adversityRowY]);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((val) => mounted && setReduceMotion(val))
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (val) => setReduceMotion(val)
    );

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const handleScenarioChange = (index: number) => {
    if (index === activeScenarioIndex) return;

    if (reduceMotion) {
      setActiveScenarioIndex(index);
      return;
    }

    fade.stopAnimation();

    Animated.timing(fade, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setActiveScenarioIndex(index);

      requestAnimationFrame(() => {
        Animated.timing(fade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
    });
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 mb-8">
          <Text
            className="text-3xl font-black tracking-tight text-slate-900 dark:text-white"
            accessibilityRole="header"
          >
            How it works
          </Text>

          <Text className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">
            What happened matters. The{' '}
            <Text className="font-bold text-slate-900 dark:text-slate-200">
              story
            </Text>{' '}
            you tell yourself often decides how it lands.
          </Text>

          <View className="mt-6 rounded-2xl bg-white p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <View className="flex-row items-center mb-2">
              <BookOpen size={16} color="#6366f1" />
              <Text className="ml-2 font-bold text-sm text-slate-900 dark:text-slate-100">
                The Science
              </Text>
            </View>

            <Text className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              We often think <Text className="font-bold">Adversity (A)</Text>{' '}
              causes the <Text className="font-bold">Consequence (C)</Text>. Actually, your{' '}
              <Text className="font-bold text-amber-600 dark:text-amber-500">
                Beliefs (B)
              </Text>{' '}
              often shape how you feel and what you do next.
            </Text>
          </View>
        </View>

        {/* Scenario Selector */}
        <View className="mb-6">
          <View className="px-6 mb-3 flex-row justify-between items-center">
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
              See it in action
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
          >
            {SCENARIOS.map((scenario, index) => {
              const isActive = index === activeScenarioIndex;

              return (
                <Pressable
                  key={scenario.id}
                  onPress={() => handleScenarioChange(index)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Scenario: ${scenario.label}`}
                  accessibilityHint="Shows an example timeline for this scenario"
                  className={`flex-row items-center justify-center rounded-full px-4 py-2 border ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 dark:bg-white dark:border-white'
                      : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                  }`}
                >
                  {isActive && (
                    <RefreshCw
                      size={12}
                      color={isActive ? '#ffffff' : '#94a3b8'}
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text
                    className={`text-xs font-bold text-center ${
                      isActive
                        ? 'text-white dark:text-black'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {scenario.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Timeline */}
        <View className="relative px-6 mt-2">
          {/* Line behind nodes */}
          {lineGeom && (
            <View
              pointerEvents="none"
              className="absolute left-6 w-10 items-center z-0"
              style={{ top: lineGeom.top, height: lineGeom.height }}
            >
              <View className="h-full w-[2px] bg-slate-200 dark:bg-slate-800 relative">
                <View
                  className="absolute -bottom-1 rounded-full bg-slate-300 dark:bg-slate-700"
                  style={{ width: 8, height: 8, left: -3 }}
                />
              </View>
            </View>
          )}

          {/* Fade the step content on scenario switch */}
          <Animated.View
            style={{ opacity: fade }}
            // nativewind usually supports className on Animated.View.
            // If your setup complains, tell me and I will show the 1-line wrapper fix.
            className="gap-8 z-10"
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              setStepsLayout({ y, height });
            }}
          >
            {steps.map((step) => {
              // @ts-ignore
              const exampleText = activeScenario.examples[step.key];
              const isPivotPoint = step.key === 'dispute';
              const isAdversity = step.key === 'adversity';

              return (
                <View
                  key={step.key}
                  onLayout={
                    isAdversity
                      ? (e) => setAdversityRowY(e.nativeEvent.layout.y)
                      : undefined
                  }
                >
                  {isPivotPoint && <PivotPoint />}
                  <TimelineItem def={step} exampleText={exampleText} />
                </View>
              );
            })}
          </Animated.View>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white/95 px-6 pt-4 dark:bg-slate-950/95 border-t border-slate-100 dark:border-slate-800"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Link href="/new" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try a two-minute entry"
            accessibilityHint="Starts a new entry"
            className="relative flex-row items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-4 active:bg-indigo-700"
          >
            <View className="mr-3 rounded-full bg-white/20 p-1">
              <Zap size={16} color="white" />
            </View>
            <Text className="text-lg font-bold text-center text-white">
              Try a 2-minute entry
            </Text>
            <View className="absolute right-4 opacity-50">
              <ArrowRight size={20} color="white" />
            </View>
          </Pressable>
        </Link>

        <Text className="mt-3 text-center text-xs font-medium text-slate-400">
          No perfection required. Just start.
        </Text>
      </View>
    </View>
  );
}

function TimelineItem({
  def,
  exampleText,
}: {
  def: StepDefinition;
  exampleText: string;
}) {
  const getStyles = () => {
    switch (def.tone) {
      case 'belief':
        return {
          nodeBg: 'bg-amber-100 dark:bg-amber-900/30',
          nodeText: 'text-amber-900 dark:text-amber-100',
          border: 'border-amber-200 dark:border-amber-800/50',
          bg: 'bg-amber-50/50 dark:bg-amber-950/10',
          title: 'text-amber-900 dark:text-amber-100',
          iconColor: '#d97706',
          iconChipBg: 'bg-amber-100/70 dark:bg-amber-900/20',
        };
      case 'dispute':
        return {
          nodeBg: 'bg-indigo-100 dark:bg-indigo-900/30',
          nodeText: 'text-indigo-900 dark:text-indigo-100',
          border: 'border-indigo-200 dark:border-indigo-800/50',
          bg: 'bg-indigo-50/50 dark:bg-indigo-950/10',
          title: 'text-indigo-900 dark:text-indigo-100',
          iconColor: '#4f46e5',
          iconChipBg: 'bg-indigo-100/70 dark:bg-indigo-900/20',
        };
      case 'energy':
        return {
          nodeBg: 'bg-teal-100 dark:bg-teal-900/30',
          nodeText: 'text-teal-900 dark:text-teal-100',
          border: 'border-teal-200 dark:border-teal-800/50',
          bg: 'bg-teal-50/50 dark:bg-teal-950/10',
          title: 'text-teal-900 dark:text-teal-100',
          iconColor: '#0d9488',
          iconChipBg: 'bg-teal-100/70 dark:bg-teal-900/20',
        };
      default:
        return {
          nodeBg: 'bg-slate-100 dark:bg-slate-800',
          nodeText: 'text-slate-700 dark:text-slate-200',
          border: 'border-slate-200 dark:border-slate-800',
          bg: 'bg-white dark:bg-slate-900',
          title: 'text-slate-900 dark:text-slate-100',
          iconColor: '#64748b',
          iconChipBg: 'bg-slate-100/70 dark:bg-slate-800/40',
        };
    }
  };

  const s = getStyles();
  const Icon = def.icon;

  return (
    <View className="flex-row items-start">
      {/* Left node is the letter */}
      <View
        className={`z-10 h-10 w-10 items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${s.nodeBg}`}
        accessibilityRole="text"
        accessibilityLabel={`Step ${def.letter}`}
      >
        <Text className={`text-sm font-black ${s.nodeText}`}>{def.letter}</Text>
      </View>

      {/* Content */}
      <View className="ml-4 flex-1 pt-1">
        <View className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
          <View className="flex-row items-center justify-between">
            <Text className={`text-base font-bold ${s.title}`}>{def.label}</Text>

            <View className={`rounded-full px-2 py-1 ${s.iconChipBg}`}>
              <Icon size={14} color={s.iconColor} strokeWidth={2.5} />
            </View>
          </View>

          <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
            <Text className="font-bold text-slate-900 dark:text-slate-200">
              {def.desc}
            </Text>
          </Text>

          <View className="mt-3 overflow-hidden rounded-lg bg-white/60 px-3 py-2.5 dark:bg-black/20">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
              Example
            </Text>
            <Text className="font-medium italic text-slate-700 dark:text-slate-300">
              {exampleText}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
function PivotPoint() {
  return (
    <View className="mb-8">
      <View className="flex-row items-start">
        {/* Dot at the top-left instead of centered */}
        <View className="z-10 relative w-10 items-center">
          {/* tweak mt-[2px] if you want it perfectly aligned with header text */}
          <View className="mt-[2px] h-10 w-10 items-start justify-start rounded-full bg-slate-50 dark:bg-slate-950">
            <View className="mt-4 ml-4 h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
          </View>
        </View>

        {/* Card aligned with the normal right column */}
        <View className="ml-4 flex-1 pt-1">
          <View className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/90 p-4 shadow-md dark:border-slate-700 dark:bg-slate-900/50">
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
              The Pivot
            </Text>

            <Text className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              You can continue on your own, or get an optional AI assisted analysis based on your{' '}
              <Text className="font-bold text-slate-900 dark:text-slate-200">
                A + B + C
              </Text>
              .
            </Text>

            <View className="mt-3 flex-row gap-8">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Quick Path
                </Text>
                <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Continue with the{' '}
                  <Text className="font-bold">standard questions</Text> for{' '}
                  <Text className="font-bold">Dispute (D)</Text> and{' '}
                  <Text className="font-bold">Energy (E)</Text>.
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Guided Path
                </Text>
                <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Get an <Text className="font-bold">analysis</Text> of your entry and{' '}
                  <Text className="font-bold">tailored questions</Text> specific to your
                  entry, then continue to{' '}
                  <Text className="font-bold">Dispute (D)</Text> and{' '}
                  <Text className="font-bold">Energy (E)</Text>.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
