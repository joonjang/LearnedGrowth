import {
   TimelineItem,
   TimelineLine,
   TimelinePivot,
   TimelineStepDef,
} from '@/components/entries/details/Timeline';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { ABCDE_FIELD, ROUTE_LOGIN } from '@/lib/constants';
import { getShadow } from '@/lib/shadow';
import {
   BELIEF_TEXT_CLASS,
   DISPUTE_TEXT_CLASS,
   ENERGY_TEXT_CLASS,
   PRIMARY_CTA_CLASS,
} from '@/lib/styles';
import { FieldTone } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { ArrowRight, Briefcase, HeartCrack, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
   AccessibilityInfo,
   Animated,
   Pressable,
   ScrollView,
   Text,
   View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RoundedCloseButton from '../buttons/RoundedCloseButton';

// Helper to map keys to tones
const getToneForKey = (key: string): FieldTone => {
   if (key === 'belief') return 'belief';
   if (key === 'dispute') return 'dispute';
   if (key === 'energy') return 'energy';
   return 'neutral';
};

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

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

type Props = {
   isModal?: boolean;
   onClose?: () => void;
};

export default function QuickStartScreen({ isModal, onClose }: Props) {
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { t } = useTranslation();
   const { lock: lockNavigation, locked: navigationLocked } =
      useNavigationLock();
   const { status } = useAuth();
   const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);
   const [reduceMotion, setReduceMotion] = useState(false);
   const scenarios = useMemo(
      () => [
         {
            id: 'work',
            label: t('quickstart.scenarios.work.label'),
            examples: {
               adversity: t('quickstart.scenarios.work.adversity'),
               belief: t('quickstart.scenarios.work.belief'),
               consequence: t('quickstart.scenarios.work.consequence'),
               dispute: t('quickstart.scenarios.work.dispute'),
               energy: t('quickstart.scenarios.work.energy'),
            },
         },
         {
            id: 'social',
            label: t('quickstart.scenarios.social.label'),
            examples: {
               adversity: t('quickstart.scenarios.social.adversity'),
               belief: t('quickstart.scenarios.social.belief'),
               consequence: t('quickstart.scenarios.social.consequence'),
               dispute: t('quickstart.scenarios.social.dispute'),
               energy: t('quickstart.scenarios.social.energy'),
            },
         },
         {
            id: 'internal',
            label: t('quickstart.scenarios.internal.label'),
            examples: {
               adversity: t('quickstart.scenarios.internal.adversity'),
               belief: t('quickstart.scenarios.internal.belief'),
               consequence: t('quickstart.scenarios.internal.consequence'),
               dispute: t('quickstart.scenarios.internal.dispute'),
               energy: t('quickstart.scenarios.internal.energy'),
            },
         },
      ],
      [t],
   );
   const activeScenario = scenarios[activeScenarioIndex];
   const cardShadow = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark],
   );
   const buttonShadow = useMemo(
      () => getShadow({ isDark, preset: 'button', colorLight: '#4f46e5' }),
      [isDark],
   );
   const showLogin = !isModal && status !== 'signedIn';

   // Generate Timeline Steps
   const steps: TimelineStepDef[] = useMemo(
      () =>
         ABCDE_FIELD.map((f, idx) => ({
            key: f.key,
            letter: LETTERS[idx] ?? '',
            label: t(f.labelKey),
            desc: t(f.hintKey),
            tone: getToneForKey(f.key),
         })),
      [t],
   );

   const fade = useRef(new Animated.Value(1)).current;
   const ctaPulse = useRef(new Animated.Value(1)).current;
   const ctaArrowNudge = useRef(new Animated.Value(0)).current;

   useEffect(() => {
      let mounted = true;
      AccessibilityInfo.isReduceMotionEnabled()
         .then((val) => mounted && setReduceMotion(val))
         .catch(() => {});
      return () => {
         mounted = false;
      };
   }, []);

   useEffect(() => {
      if (reduceMotion) return;
      const loop = Animated.loop(
         Animated.sequence([
            Animated.timing(ctaPulse, {
               toValue: 1.02,
               duration: 1100,
               useNativeDriver: true,
            }),
            Animated.timing(ctaPulse, {
               toValue: 1,
               duration: 1100,
               useNativeDriver: true,
            }),
         ]),
      );
      loop.start();
      return () => loop.stop();
   }, [ctaPulse, reduceMotion]);

   useEffect(() => {
      if (reduceMotion) return;
      const loop = Animated.loop(
         Animated.sequence([
            Animated.timing(ctaArrowNudge, {
               toValue: -10,
               duration: 600,
               useNativeDriver: true,
            }),
            Animated.timing(ctaArrowNudge, {
               toValue: 4,
               duration: 600,
               useNativeDriver: true,
            }),
            Animated.timing(ctaArrowNudge, {
               toValue: 0,
               duration: 600,
               useNativeDriver: true,
            }),
         ]),
      );
      loop.start();
      return () => loop.stop();
   }, [ctaArrowNudge, reduceMotion]);

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

   const handleCtaPress = useCallback(() => {
      lockNavigation(() => {
         try {
            router.push('/new');
         } catch (e) {
            console.warn('Navigation unavailable for /new', e);
         }
      });
   }, [lockNavigation]);

   const handleLoginPress = useCallback(() => {
      lockNavigation(() => {
         try {
            router.push(ROUTE_LOGIN);
         } catch (e) {
            console.warn('Navigation unavailable for /login', e);
         }
      });
   }, [lockNavigation]);

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
         <ScrollView
            contentContainerStyle={{
               paddingTop: !isModal ? insets.top + 24 : 20,
               paddingBottom: insets.bottom + 24,
            }}
            showsVerticalScrollIndicator={false}
         >
            <View className="px-6 mb-8">
               <View className="flex-row justify-between items-start">
                  <Text
                     className="flex-1 mr-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white"
                     accessibilityRole="header"
                  >
                     {t('quickstart.title')}
                  </Text>

                  <View className="mt-1.5 items-end gap-2">
                     {showLogin && (
                        <Pressable
                           onPress={handleLoginPress}
                           className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 active:opacity-70"
                        >
                           <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">
                              {t('common.log_in')}
                           </Text>
                        </Pressable>
                     )}
                     {isModal && (
                        <RoundedCloseButton onPress={() => onClose?.()} />
                     )}
                  </View>
               </View>

               <Text className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">
                  <Trans
                     i18nKey="quickstart.story_intro"
                     components={{
                        bold: (
                           <Text className="font-semibold text-slate-900 dark:text-slate-100" />
                        ),
                     }}
                  />
               </Text>

               {/* The ABC Card - Updated colors to match Theme */}
               <View
                  className="mt-6 rounded-2xl bg-white p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  style={[cardShadow.ios, cardShadow.android]}
               >
                  <Text className="text-base leading-7 text-slate-700 dark:text-slate-300">
                     <Text className="font-bold text-slate-900 dark:text-slate-100">
                        {t('quickstart.abc_title')}
                     </Text>
                     {'\n'}
                     <Trans
                        i18nKey="quickstart.abc_body"
                        components={{
                           bold: (
                              <Text className="font-bold text-slate-900 dark:text-slate-100" />
                           ),
                           boldBelief: (
                              <Text
                                 className={`font-bold ${BELIEF_TEXT_CLASS}`}
                              />
                           ),
                        }}
                     />
                  </Text>

                  <View className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                     <Text className="italic text-xs leading-5 text-slate-400 dark:text-slate-500">
                        {t('quickstart.citation')}
                     </Text>
                  </View>
               </View>

               <Text className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-400">
                  <Trans
                     i18nKey="quickstart.reframe_intro"
                     components={{
                        bold: (
                           <Text className="font-semibold text-slate-900 dark:text-slate-100" />
                        ),
                     }}
                  />
               </Text>

               {/* Solution Text - Updated colors to match Theme */}
               <Text className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
                  <Trans
                     i18nKey="quickstart.solution"
                     components={{
                        boldDispute: (
                           <Text
                              className={`font-bold ${DISPUTE_TEXT_CLASS}`}
                           />
                        ),
                        boldEnergy: (
                           <Text className={`font-bold ${ENERGY_TEXT_CLASS}`} />
                        ),
                     }}
                  />
               </Text>
            </View>

            {/* Scenario Selector */}
            <View className="mb-6">
               <View className="px-6 mb-3 flex-row justify-between items-center">
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                     {t('quickstart.see_action')}
                  </Text>
               </View>
               <View className="flex-row flex-wrap justify-evenly">
                  {scenarios.map((scenario, index) => {
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
                           className="flex-row items-center justify-center rounded-full px-2 py-2 border"
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
               </View>
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
                                    {t('quickstart.pivot_title')}
                                 </Text>

                                 <Text className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    <Trans
                                       i18nKey="quickstart.pivot_desc"
                                       components={{
                                          bold: (
                                             <Text className="font-bold text-slate-900 dark:text-slate-200" />
                                          ),
                                       }}
                                    />
                                 </Text>

                                 <View className="mt-3 flex-row gap-8">
                                    <View className="flex-1">
                                       <Text className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                          {t('quickstart.quick_path_title')}
                                       </Text>
                                       <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                          <Trans
                                             i18nKey="quickstart.quick_path_desc"
                                             components={{
                                                bold: (
                                                   <Text className="font-bold" />
                                                ),
                                                boldDispute: (
                                                   <Text
                                                      className={`font-bold ${DISPUTE_TEXT_CLASS}`}
                                                   />
                                                ),
                                                boldEnergy: (
                                                   <Text
                                                      className={`font-bold ${ENERGY_TEXT_CLASS}`}
                                                   />
                                                ),
                                             }}
                                          />
                                       </Text>
                                    </View>

                                    <View className="flex-1">
                                       <Text className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                          {t('quickstart.guided_path_title')}
                                       </Text>
                                       <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                          <Trans
                                             i18nKey="quickstart.guided_path_desc"
                                             components={{
                                                bold: (
                                                   <Text className="font-bold" />
                                                ),
                                             }}
                                          />
                                       </Text>
                                    </View>
                                 </View>
                              </TimelinePivot>
                           )}
                           <TimelineItem step={step} variant="default">
                              <View className="mt-3 overflow-hidden rounded-lg bg-slate-50 dark:bg-black/20 px-3 py-2.5">
                                 <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
                                    {t('common.example')}
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

            {/* Footer CTA */}
            {!isModal && (
               <View className="px-6 pt-8">
                  <Animated.View
                     style={[
                        { transform: [{ scale: ctaPulse }] },
                        [cardShadow.ios, cardShadow.android],
                     ]}
                  >
                     <Pressable
                        className={`relative flex-row items-center justify-center rounded-2xl px-6 py-4 ${PRIMARY_CTA_CLASS} ${buttonShadow.className}`}
                        style={[buttonShadow.ios, buttonShadow.android]}
                        onPress={handleCtaPress}
                        disabled={navigationLocked}
                     >
                        <Text
                           className="text-lg font-bold text-center text-white"
                           numberOfLines={1}
                        >
                           {t('quickstart.cta')}
                        </Text>
                        <Animated.View
                           className="absolute right-4 opacity-50"
                           style={{
                              transform: [{ translateX: ctaArrowNudge }],
                           }}
                        >
                           <ArrowRight size={20} color="white" />
                        </Animated.View>
                     </Pressable>
                  </Animated.View>
                  <Text className="mt-3 text-center text-xs font-medium text-slate-400">
                     {t('quickstart.cta_sub')}
                  </Text>
               </View>
            )}
         </ScrollView>
      </View>
   );
}
