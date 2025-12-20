import { Link } from 'expo-router';
import {
    ArrowRight,
    BookOpen,
    BrainCircuit,
    Camera,
    Frown,
    RefreshCw,
    Sunrise,
    Zap,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    Text,
    UIManager,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Enable layout animation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Types ---
type StepTone = 'neutral' | 'belief' | 'dispute' | 'energy';

type StepDefinition = {
  key: string;
  letter: string;
  label: string;
  desc: string;
  hint: string;
  tone: StepTone;
  icon: React.ElementType;
};

// --- 1. Step Configuration ---
const STEPS: StepDefinition[] = [
  {
    key: 'adversity',
    letter: 'A',
    label: 'Adversity',
    desc: 'The objective situation. Be a camera, not a judge.',
    hint: 'Short & specific facts only.',
    tone: 'neutral',
    icon: Camera,
  },
  {
    key: 'belief',
    letter: 'B',
    label: 'Belief',
    desc: 'The story you told yourself about the event.',
    hint: 'What did you interpret this to mean?',
    tone: 'belief',
    icon: BrainCircuit,
  },
  {
    key: 'consequence',
    letter: 'C',
    label: 'Consequence',
    desc: 'The emotions and behaviors that followed.',
    hint: 'How did that belief make you feel?',
    tone: 'neutral',
    icon: Frown,
  },
  // GAP / PIVOT POINT HAPPENS HERE LOGICALLY
  {
    key: 'dispute',
    letter: 'D',
    label: 'Disputation',
    desc: 'Challenge the negative story with facts.',
    hint: 'Look for evidence against the belief.',
    tone: 'dispute',
    icon: Zap,
  },
  {
    key: 'energy',
    letter: 'E',
    label: 'Energy',
    desc: 'The shift in your mood and outlook.',
    hint: 'How do you feel now?',
    tone: 'energy',
    icon: Sunrise,
  },
];

// --- 2. Scenario Data ---
const SCENARIOS = [
  {
    id: 'work',
    label: 'Work Stress',
    examples: {
      adversity: 'I sent a report with a noticeable typo in the title.',
      belief: '“I’m unprofessional and I’m probably going to get fired.”',
      consequence: 'Anxious -> Froze up and avoided my inbox.',
      dispute: '“One typo doesn’t erase my track record. I can send a correction.”',
      energy: 'Relieved -> Sent the fixed version immediately.',
    },
  },
  {
    id: 'social',
    label: 'Social Anxiety',
    examples: {
      adversity: 'I texted my friend “hello” three hours ago and no reply.',
      belief: '“They find me annoying and are ignoring me intentionally.”',
      consequence: 'Lonely -> Put phone on DND and isolated myself.',
      dispute: '“They might be busy at work. My worth isn’t tied to text speed.”',
      energy: 'Calmer -> Decided to go for a walk instead of waiting.',
    },
  },
  {
    id: 'internal',
    label: 'Self Criticism',
    examples: {
      adversity: 'I skipped the gym this morning because I overslept.',
      belief: '“I have zero discipline. I’m going to lose all my progress.”',
      consequence: 'Ashamed -> Ate a fast-food lunch out of frustration.',
      dispute: '“Rest is part of training. Missing one day is a blip, not a disaster.”',
      energy: 'Self-compassion -> Packed my gym bag for tomorrow.',
    },
  },
];

export default function QuickStartScreen() {
  const insets = useSafeAreaInsets();
  const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);

  const activeScenario = SCENARIOS[activeScenarioIndex];

  const handleScenarioChange = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveScenarioIndex(index);
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
        {/* --- Header Section --- */}
        <View className="px-6 mb-8">
          <Text className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            How it works
          </Text>
          <Text className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">
            Events don’t hurt us. The{' '}
            <Text className="font-bold text-slate-900 dark:text-slate-200">
              stories
            </Text>{' '}
            we tell ourselves about them do.
          </Text>

          {/* Science Box */}
          <View className="mt-6 rounded-2xl bg-white p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <View className="flex-row items-center mb-2">
              <BookOpen
                size={16}
                className="text-indigo-600 dark:text-indigo-400"
              />
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
              dictate how you feel.
            </Text>
          </View>
        </View>

        {/* --- Scenario Selector --- */}
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
                  className={`flex-row items-center justify-center rounded-full px-4 py-2 border ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 dark:bg-white dark:border-white'
                      : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                  }`}
                >
                  {isActive && (
                    <RefreshCw
                      size={12}
                      color={Platform.OS === 'ios' ? 'white' : 'black'}
                      className="mr-2"
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

        {/* --- Timeline Container --- */}
        <View className="relative px-6 mt-2">
          {/* ROBUST ALIGNMENT FIX:
            1. absolute left-6: Starts exactly where the padding ends (24px), same as the icons.
            2. w-10: Matches the icon width (40px) exactly.
            3. items-center: Flexbox automatically calculates the perfect center.
          */}
          <View className="absolute left-6 top-5 bottom-8 w-10 items-center justify-center z-0">
             {/* The Vertical Line */}
             <View className="h-full w-[2px] bg-slate-200 dark:bg-slate-800 overflow-visible relative">
                {/* The End Dot */}
                <View className="absolute -bottom-1 -left-[3px] h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
             </View>
          </View>

          <View className="gap-8 z-10">
            {STEPS.map((step, index) => {
              const isPivotPoint = index === 3;
              // @ts-ignore
              const exampleText = activeScenario.examples[step.key];

              return (
                <View key={step.key}>
                  {isPivotPoint && <PivotPoint />}
                  <TimelineItem def={step} exampleText={exampleText} />
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* --- Footer CTA --- */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white/95 px-6 pt-4 dark:bg-slate-950/95 border-t border-slate-100 dark:border-slate-800"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Link href="/new" asChild>
          <Pressable className="group relative flex-row items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-4 active:bg-indigo-700">
            <View className="mr-3 rounded-full bg-white/20 p-1">
              <Zap size={16} color="white" fill="white" />
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

// --- Sub Components ---

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
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          iconColor: '#d97706',
          border: 'border-amber-200 dark:border-amber-800/50',
          bg: 'bg-amber-50/50 dark:bg-amber-950/10',
          title: 'text-amber-900 dark:text-amber-100',
        };
      case 'dispute':
        return {
          iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
          iconColor: '#4f46e5',
          border: 'border-indigo-200 dark:border-indigo-800/50',
          bg: 'bg-indigo-50/50 dark:bg-indigo-950/10',
          title: 'text-indigo-900 dark:text-indigo-100',
        };
      case 'energy':
        return {
          iconBg: 'bg-teal-100 dark:bg-teal-900/30',
          iconColor: '#0d9488',
          border: 'border-teal-200 dark:border-teal-800/50',
          bg: 'bg-teal-50/50 dark:bg-teal-950/10',
          title: 'text-teal-900 dark:text-teal-100',
        };
      default:
        return {
          iconBg: 'bg-slate-100 dark:bg-slate-800',
          iconColor: '#64748b',
          border: 'border-slate-200 dark:border-slate-800',
          bg: 'bg-white dark:bg-slate-900',
          title: 'text-slate-900 dark:text-slate-100',
        };
    }
  };

  const s = getStyles();
  const Icon = def.icon;

  return (
    <View className="flex-row items-start">
      {/* Icon Node */}
      <View
        className={`z-10 h-10 w-10 items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${s.iconBg}`}
      >
        <Icon size={18} color={s.iconColor} strokeWidth={2.5} />
      </View>

      {/* Content Card */}
      <View className="ml-4 flex-1 pt-1">
        <View className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
          {/* Card Header */}
          <View className="flex-row items-center justify-between">
            <Text className={`text-base font-bold ${s.title}`}>{def.label}</Text>
            <View className="rounded px-1.5 py-0.5 bg-white/60 dark:bg-black/20">
              <Text className="text-[10px] font-black text-center text-slate-400">
                {def.letter}
              </Text>
            </View>
          </View>

          <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
            {def.desc}
          </Text>

          {/* Example Section */}
          <View className="mt-3 overflow-hidden rounded-lg bg-white/60 px-3 py-2.5 dark:bg-black/20">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
              Example
            </Text>
            <Text className="font-medium italic text-slate-700 dark:text-slate-300">
              "{exampleText}"
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PivotPoint() {
  return (
    <View className="my-1 flex-row items-center">
      {/* The Visual Pivot Icon */}
      <View className="z-10 relative h-10 w-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950">
        <View className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
      </View>

      <View className="ml-4 flex-1 border-t border-dashed border-slate-300 dark:border-slate-700" />

      <View className="absolute left-14 right-0 items-center justify-center">
        <View className="bg-slate-50 px-3 py-1 dark:bg-slate-950">
          <Text className="text-xs font-bold uppercase tracking-widest text-center text-slate-400">
            The Pivot
          </Text>
        </View>
      </View>
    </View>
  );
}