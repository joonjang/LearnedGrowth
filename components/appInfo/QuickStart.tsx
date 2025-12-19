import { Link } from 'expo-router';
import {
    ArrowRight,
    BrainCircuit,
    Camera,
    Frown,
    Sunrise,
    Zap
} from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Types ---
type StepTone = 'neutral' | 'belief' | 'dispute' | 'energy';

type StepData = {
  type: 'step';
  letter: string;
  title: string;
  desc: string;
  hint: string;
  example: string;
  tone: StepTone;
  icon: React.ElementType;
};

type GapData = { type: 'gap' };

const STEPS: (StepData | GapData)[] = [
  {
    type: 'step',
    letter: 'A',
    title: 'Adversity',
    desc: 'The situation. Be a camera, not a judge.',
    hint: 'Short & specific facts only.',
    example: '“Missed the deadline.”',
    tone: 'neutral',
    icon: Camera,
  },
  {
    type: 'step',
    letter: 'B',
    title: 'Belief',
    desc: 'The story you told yourself.',
    hint: 'What did you think this meant about you?',
    example: '“I am lazy and unreliable.”',
    tone: 'belief',
    icon: BrainCircuit,
  },
  {
    type: 'step',
    letter: 'C',
    title: 'Consequence',
    desc: 'The heavy feeling.',
    hint: 'How did that belief make you feel/act?',
    example: '“Anxious -> Ignored emails.”',
    tone: 'neutral',
    icon: Frown,
  },
  { type: 'gap' },
  {
    type: 'step',
    letter: 'D',
    title: 'Disputation',
    desc: 'Challenge the story.',
    hint: 'Look for evidence against the negative belief.',
    example: '“I’m usually on time. I can communicate the delay.”',
    tone: 'dispute',
    icon: Zap,
  },
  {
    type: 'step',
    letter: 'E',
    title: 'Energy',
    desc: 'The shift in mood.',
    hint: 'How do you feel now?',
    example: '“Relieved -> Sent the email.”',
    tone: 'energy',
    icon: Sunrise,
  },
];

export default function MinimalTimelineGuide() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 140,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View className="mb-8">
          <Text className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            How it works
          </Text>
          <Text className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">
            Events don’t hurt us. The <Text className="font-bold text-slate-900 dark:text-slate-200">stories</Text> we tell ourselves about them do.
            {'\n\n'}
            Use the ABCDE method to catch those stories and rewrite them.
          </Text>
        </View>

        {/* Timeline Container */}
        <View className="relative mt-2">
          {/* Main Continuous Line */}
          <View className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-slate-200 dark:bg-slate-800" />
          
          <View className="gap-8">
            {STEPS.map((step, index) => {
              if (step.type === 'gap') return <PivotPoint key={`gap-${index}`} />;
              return <TimelineItem key={step.letter} {...step} />;
            })}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button / CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white/95 px-6 pt-4 dark:bg-slate-950/95 border-t border-slate-100 dark:border-slate-800"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Link href="/new" asChild>
          <Pressable className="group relative flex-row items-center justify-center overflow-hidden rounded-2xl bg-slate-900 px-6 py-4 active:bg-slate-800 dark:bg-indigo-600 dark:active:bg-indigo-700">
            <View className="mr-3 rounded-full bg-white/20 p-1">
               <Zap size={16} color="white" fill="white" />
            </View>
            <Text className="text-lg font-bold text-white">
              Start a New Entry
            </Text>
            <View className="absolute right-4 opacity-50">
               <ArrowRight size={20} color="white" />
            </View>
          </Pressable>
        </Link>
        <Text className="mt-3 text-center text-xs font-medium text-slate-400">
          Takes about 2 minutes. No perfection required.
        </Text>
      </View>
    </View>
  );
}

// --- Sub Components ---

function TimelineItem({
  letter,
  title,
  desc,
  hint,
  example,
  tone,
  icon: Icon
}: StepData) {
  
  // Dynamic Styling Logic
  const getStyles = () => {
    switch (tone) {
      case 'belief': // The "Problem" - Warn/Amber
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          iconColor: '#d97706', // amber-600
          border: 'border-amber-200 dark:border-amber-800/50',
          bg: 'bg-amber-50/50 dark:bg-amber-950/10',
          title: 'text-amber-900 dark:text-amber-100',
        };
      case 'dispute': // The "Action" - Info/Indigo
        return {
          iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
          iconColor: '#4f46e5', // indigo-600
          border: 'border-indigo-200 dark:border-indigo-800/50',
          bg: 'bg-indigo-50/50 dark:bg-indigo-950/10',
          title: 'text-indigo-900 dark:text-indigo-100',
        };
      case 'energy': // The "Result" - Success/Teal
        return {
          iconBg: 'bg-teal-100 dark:bg-teal-900/30',
          iconColor: '#0d9488', // teal-600
          border: 'border-teal-200 dark:border-teal-800/50',
          bg: 'bg-teal-50/50 dark:bg-teal-950/10',
          title: 'text-teal-900 dark:text-teal-100',
        };
      default: // Neutral
        return {
          iconBg: 'bg-slate-100 dark:bg-slate-800',
          iconColor: '#64748b', // slate-500
          border: 'border-slate-200 dark:border-slate-800',
          bg: 'bg-white dark:bg-slate-900',
          title: 'text-slate-900 dark:text-slate-100',
        };
    }
  };

  const s = getStyles();

  return (
    <View className="flex-row items-start">
      {/* Icon Node */}
      <View className={`z-10 h-10 w-10 items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${s.iconBg}`}>
        <Icon size={18} color={s.iconColor} strokeWidth={2.5} />
      </View>

      {/* Content Card */}
      <View className="ml-4 flex-1 pt-1">
        <View className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
          {/* Card Header */}
          <View className="flex-row items-center justify-between">
            <Text className={`text-base font-bold ${s.title}`}>{title}</Text>
            <View className="rounded px-1.5 py-0.5 bg-white/60 dark:bg-black/20">
              <Text className="text-[10px] font-black text-slate-400">{letter}</Text>
            </View>
          </View>
          
          <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
            {desc}
          </Text>

          {/* Example Section */}
          <View className="mt-3 overflow-hidden rounded-lg bg-white/60 px-3 py-2.5 dark:bg-black/20">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
              Example
            </Text>
            <Text className="font-medium italic text-slate-700 dark:text-slate-300">
              {example}
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
      <View className="relative h-10 w-10 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <View className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
      </View>

      <View className="ml-4 flex-1 border-t border-dashed border-slate-300 dark:border-slate-700" />
      
      <View className="absolute left-14 right-0 items-center justify-center">
        <View className="bg-slate-50 px-3 py-1 dark:bg-slate-950">
          <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
            The Pivot
          </Text>
        </View>
      </View>
    </View>
  );
}