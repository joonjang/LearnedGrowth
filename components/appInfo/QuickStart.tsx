import { ABCDE_FIELD } from '@/components/constants';
import {
   TimelineItem,
   TimelineLine,
   TimelinePivot,
   TimelineStepDef,
} from '@/components/entries/entry/Timeline';
import { getShadow } from '@/lib/shadow';
import { FieldTone } from '@/lib/theme';
import { router } from 'expo-router';
import { ArrowRight, Briefcase, HeartCrack, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
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

// Helper to map keys to tones
const getToneForKey = (key: string): FieldTone => {
   if (key === 'belief') return 'belief';
   if (key === 'dispute') return 'dispute';
   if (key === 'energy') return 'energy';
   return 'neutral';
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
         dispute:
            'One missed session does not erase progress. I can reset today.',
         energy: 'Kinder to myself. I planned a simple workout for tomorrow.',
      },
   },
];

const SCENARIO_STYLES = {
   work: {
      Icon: Briefcase,
      light: {
         bg: '#EEF2FF',
         border: '#C7D2FE',
         text: '#3730A3',
         icon: '#4338CA',
      }, // indigo-ish
      dark: {
         bg: '#1E1B4B',
         border: '#312E81',
         text: '#C7D2FE',
         icon: '#A5B4FC',
      },
      activeLight: {
         bg: '#4338CA',
         border: '#4338CA',
         text: '#FFFFFF',
         icon: '#FFFFFF',
      },
      activeDark: {
         bg: '#EEF2FF',
         border: '#EEF2FF',
         text: '#111827',
         icon: '#111827',
      },
   },
   social: {
      Icon: Users,
      light: {
         bg: '#ECFDF5',
         border: '#A7F3D0',
         text: '#065F46',
         icon: '#059669',
      }, // emerald-ish
      dark: {
         bg: '#052E16',
         border: '#065F46',
         text: '#A7F3D0',
         icon: '#6EE7B7',
      },
      activeLight: {
         bg: '#059669',
         border: '#059669',
         text: '#FFFFFF',
         icon: '#FFFFFF',
      },
      activeDark: {
         bg: '#ECFDF5',
         border: '#ECFDF5',
         text: '#111827',
         icon: '#111827',
      },
   },
   internal: {
      Icon: HeartCrack,
      light: {
         bg: '#FFF7ED',
         border: '#FDBA74',
         text: '#9A3412',
         icon: '#EA580C',
      }, // orange-ish
      dark: {
         bg: '#431407',
         border: '#7C2D12',
         text: '#FDBA74',
         icon: '#FDBA74',
      },
      activeLight: {
         bg: '#EA580C',
         border: '#EA580C',
         text: '#FFFFFF',
         icon: '#FFFFFF',
      },
      activeDark: {
         bg: '#FFF7ED',
         border: '#FFF7ED',
         text: '#111827',
         icon: '#111827',
      },
   },
} as const;

export default function QuickStartScreen() {
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);
   const [reduceMotion, setReduceMotion] = useState(false);
   const activeScenario = SCENARIOS[activeScenarioIndex];
   const cardShadow = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark]
   );

   // Generate Timeline Steps
   const steps: TimelineStepDef[] = useMemo(() => {
      return ABCDE_FIELD.map((f, idx) => ({
         key: f.key,
         letter: LETTERS[idx] ?? '',
         label: f.label,
         desc: f.hint,
         tone: getToneForKey(f.key),
      }));
   }, []);

   const fade = useRef(new Animated.Value(1)).current;

   useEffect(() => {
      let mounted = true;
      AccessibilityInfo.isReduceMotionEnabled()
         .then((val) => mounted && setReduceMotion(val))
         .catch(() => {});
      return () => {
         mounted = false;
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
            {/* Header - EXACTLY AS REQUESTED */}
            <View className="px-6 mb-8">
               <Text
                  className="text-3xl font-black tracking-tight text-slate-900 dark:text-white"
                  accessibilityRole="header"
               >
                  Let&apos;s untangle your thoughts.
               </Text>

               <Text className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">
                  When things go wrong, we often tell ourselves a{' '}
                  <Text className="font-semibold text-slate-900 dark:text-slate-100">
                     story
                  </Text>{' '}
                  about why it happened.
               </Text>

               {/* The ABC Card - Updated colors to match Theme */}
               <View
                  className={`mt-6 rounded-2xl bg-white p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${cardShadow.className}`}
                  style={[cardShadow.ios, cardShadow.android]}
               >
                  <Text className="text-base leading-7 text-slate-700 dark:text-slate-300">
                     <Text className="font-bold text-slate-900 dark:text-slate-100">
                        The ABCs
                     </Text>
                     {'\n'}
                     An{' '}
                     <Text className="font-bold text-slate-900 dark:text-slate-100">
                        Adversity (A)
                     </Text>{' '}
                     happens. You form a{' '}
                     <Text className="font-bold text-belief-text dark:text-belief-textDark">
                        Belief (B)
                     </Text>{' '}
                     about it. That belief drives the{' '}
                     <Text className="font-bold text-slate-900 dark:text-slate-100">
                        Consequence (C)
                     </Text>
                     , how you feel and act.
                  </Text>

                  <View className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                     <Text className="italic text-xs leading-5 text-slate-400 dark:text-slate-500">
                        Seligman, M. E. P. (2011). Learned optimism: How to
                        change your mind and your life. Knopf Doubleday
                        Publishing Group.
                     </Text>
                  </View>
               </View>

               <Text className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-400">
                  We can change how you feel by looking at that{' '}
                  <Text className="font-semibold text-slate-900 dark:text-slate-100">
                     story
                  </Text>{' '}
                  again.
               </Text>

               {/* Solution Text - Updated colors to match Theme */}
               <Text className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
                  Together, we’ll use{' '}
                  <Text className="font-bold text-dispute-text dark:text-dispute-textDark">
                     Disputation (D)
                  </Text>{' '}
                  to challenge negative thoughts, helping you find{' '}
                  <Text className="font-bold text-energy-text dark:text-energy-textDark">
                     Energy (E)
                  </Text>{' '}
                  and a clearer perspective.
               </Text>
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
                     // pick palette by scenario + dark mode + active
                     const stylesForScenario =
                        SCENARIO_STYLES[
                           scenario.id as keyof typeof SCENARIO_STYLES
                        ];
                     const palette = isActive
                        ? isDark
                           ? stylesForScenario.activeDark
                           : stylesForScenario.activeLight
                        : isDark
                          ? stylesForScenario.dark
                          : stylesForScenario.light;

                     const Icon = stylesForScenario.Icon;
                     return (
                        <Pressable
                           key={scenario.id}
                           onPress={() => handleScenarioChange(index)}
                           className="flex-row items-center justify-center rounded-full px-4 py-2 border"
                           style={{
                              backgroundColor: palette.bg,
                              borderColor: palette.border,
                           }}
                        >
                           

                           <Icon
                              size={14}
                              color={palette.icon}
                              style={{ marginRight: 8 }}
                           />
                           <Text
                              className="text-xs font-bold text-center"
                              style={{ color: palette.text }}
                              numberOfLines={1}
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
               {/* Vertical Line */}
               <TimelineLine />

               <Animated.View style={{ opacity: fade }} className="z-10 gap-2">
                  {steps.map((step) => {
                     // @ts-ignore
                     const exampleText = activeScenario.examples[step.key];
                     const isPivotPoint = step.key === 'dispute';

                     return (
                        <View key={step.key}>
                           {isPivotPoint && (
                              <TimelinePivot variant="default">
                                 {/* RESTORED CONTENT - Quick Path / Guided Path */}
                                 <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    The Pivot
                                 </Text>

                                 <Text className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    You can continue on your own, or get an
                                    optional AI assisted analysis based on your{' '}
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
                                          <Text className="font-bold">
                                             standard questions
                                          </Text>{' '}
                                          for{' '}
                                          <Text className="font-bold text-dispute-text dark:text-dispute-textDark">
                                             Dispute (D)
                                          </Text>{' '}
                                          and{' '}
                                          <Text className="font-bold text-energy-text dark:text-energy-textDark">
                                             Energy (E)
                                          </Text>
                                          .
                                       </Text>
                                    </View>

                                    <View className="flex-1">
                                       <Text className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                          Guided Path
                                       </Text>
                                       <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                          Get an{' '}
                                          <Text className="font-bold">
                                             analysis
                                          </Text>{' '}
                                          of your entry and{' '}
                                          <Text className="font-bold">
                                             tailored questions
                                          </Text>{' '}
                                          specific to your entry.
                                       </Text>
                                    </View>
                                 </View>
                              </TimelinePivot>
                           )}
                           <TimelineItem step={step} variant="default">
                              <View className="mt-3 overflow-hidden rounded-lg bg-slate-50 dark:bg-black/20 px-3 py-2.5">
                                 <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
                                    Example
                                 </Text>
                                 <Text className="font-medium italic text-slate-700 dark:text-slate-300">
                                    {exampleText}
                                 </Text>
                              </View>
                           </TimelineItem>
                        </View>
                     );
                  })}
               </Animated.View>
            </View>
         </ScrollView>

         {/* Footer CTA */}
         <View
            className="absolute bottom-0 left-0 right-0 px-6 pt-4"
            style={{ paddingBottom: insets.bottom + 16 }}
         >
            <Pressable
               className="relative flex-row items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-4 active:bg-indigo-700"
               onPress={() => {
                  try {
                     router.push('/new');
                  } catch (e) {
                     console.warn('Navigation unavailable for /new', e);
                  }
               }}
            >
               <Text className="text-lg font-bold text-center text-white">
                  Try a 2-minute entry
               </Text>
               <View className="absolute right-4 opacity-50">
                  <ArrowRight size={20} color="white" />
               </View>
            </Pressable>
            <Text className="mt-3 text-center text-xs font-medium text-slate-400">
               No perfection required. Just start.
            </Text>
         </View>
      </View>
   );
}
