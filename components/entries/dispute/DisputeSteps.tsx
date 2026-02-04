import React, { useEffect, useMemo, useRef } from 'react';
import {
   ScrollView,
   Text,
   TextInput,
   TouchableOpacity,
   useWindowDimensions,
   View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import EntryContextView from '@/components/entries/dispute/EntryContextView';
import SmartInput from '@/components/inputABCDE/SmartInput';
import StepperHeader from '@/components/inputABCDE/StepperHeader';
import TypewriterText, {
   TypewriterHandle,
} from '@/components/inputABCDE/TypewriterText';
import { useSmartScroll } from '@/hooks/useSmartScroll';
import { useSmoothKeyboard } from '@/hooks/useSmoothKeyboard';
import { DISPUTE_STEP_PLACEHOLDERS } from '@/lib/constants';
import { useTranslation } from 'react-i18next';

import { Entry } from '@/models/entry';
import { NewInputDisputeType } from '@/models/newInputEntryType';

type Props = {
   entry: Entry;
   idx: number;
   currKey: NewInputDisputeType;
   prompts: Record<NewInputDisputeType, string>;
   form: Record<NewInputDisputeType, string>;
   setField: (k: NewInputDisputeType) => (v: string) => void;
   setIdx: React.Dispatch<React.SetStateAction<number>>;
   onExit: () => void;
   onSubmit: () => void;
   hasVisited: (k: NewInputDisputeType) => boolean;
   markVisited: (k: NewInputDisputeType) => void;
   disableNext?: boolean;
   contentTopPadding?: number;
};

export default function DisputeSteps({
   entry,
   idx,
   currKey,
   prompts,
   form,
   setField,
   setIdx,
   onExit,
   onSubmit,
   hasVisited,
   markVisited,
   disableNext,
   contentTopPadding = 0,
}: Props) {
   const inputRef = useRef<TextInput>(null);
   const typewriterRef = useRef<TypewriterHandle>(null);
   const { t } = useTranslation();

   const { scrollProps, reenableAutoScroll, scrollToBottom } = useSmartScroll();

   const { height: screenHeight } = useWindowDimensions();
   const isSmallScreen = screenHeight < 750;
   const maxInputHeight = Math.floor(screenHeight * 0.25);
   const closedFontSize = isSmallScreen ? 28 : 36;
   const openFontSize = isSmallScreen ? 24 : 28;
   const { animatedPromptStyle, animatedInputStyle, animatedWrapperStyle } =
      useSmoothKeyboard({
         closedHeight: maxInputHeight,
         closedFontSize,
         openFontSize,
      });

   useEffect(() => {
      reenableAutoScroll();
      requestAnimationFrame(() => scrollToBottom(false));
   }, [idx, reenableAutoScroll, scrollToBottom]);

   const stepLabels = useMemo(
      () => ({
         evidence: t('dispute.steps.evidence'),
         alternatives: t('dispute.steps.alternatives'),
         usefulness: t('dispute.steps.usefulness'),
         energy: t('dispute.steps.energy'),
      }),
      [t],
   );
   const stepPlaceholders = useMemo(
      () => ({
         evidence: t(DISPUTE_STEP_PLACEHOLDERS.evidence),
         alternatives: t(DISPUTE_STEP_PLACEHOLDERS.alternatives),
         usefulness: t(DISPUTE_STEP_PLACEHOLDERS.usefulness),
         energy: t(DISPUTE_STEP_PLACEHOLDERS.energy),
      }),
      [t],
   );

   const handleNext = () => {
      if (disableNext) return;
      reenableAutoScroll();
      if (idx < 3) {
         markVisited(currKey);
         setIdx((prev) => prev + 1);
      } else {
         onSubmit();
      }
   };

   const handleBack = () => {
      reenableAutoScroll();
      if (idx > 0) {
         setIdx((prev) => prev - 1);
      } else {
         onExit();
      }
   };

   return (
      <Animated.View className="flex-1" style={animatedWrapperStyle}>
         <View className="flex-1">
            <ScrollView
               {...scrollProps}
               showsVerticalScrollIndicator={false}
               // We mix style for dynamic padding with classes for static styling
               contentContainerStyle={{
                  flexGrow: 1,
                  paddingTop: contentTopPadding,
               }}
               className="px-5"
            >
               {/* HEADER */}
               <View className="flex-row items-center mb-2.5">
                  <View className="flex-1 mr-2">
                     <StepperHeader
                        step={idx + 1}
                        total={4}
                        label={stepLabels[currKey]}
                     />
                  </View>
                  <RoundedCloseButton onPress={onExit} />
               </View>

               {/* CONTEXT CARD */}
               <View className="mb-4">
                  <EntryContextView
                     adversity={entry.adversity}
                     belief={entry.belief}
                     consequence={entry.consequence ?? ''}
                  />
               </View>

               {/* PROMPT (Vertically Centered) */}
               <View className="flex-1 justify-center">
                  <TypewriterText
                     ref={typewriterRef}
                     text={prompts[currKey]}
                     visited={hasVisited(currKey)}
                     onFinished={() => markVisited(currKey)}
                     style={[
                        { fontWeight: '700' }, // Kept inline for specific font weight control
                        animatedPromptStyle,
                     ]}
                  />
               </View>

               {/* Spacer */}
               <View className="h-5" />
            </ScrollView>

            {/* FOOTER */}
            <View className="px-5">
               {/* Input Container */}
               <View className="my-2.5">
                  <SmartInput
                     ref={inputRef}
                     value={form[currKey]}
                     onChangeText={setField(currKey)}
                     placeholder={stepPlaceholders[currKey]}
                     animatedStyle={animatedInputStyle}
                     onFocus={() => {
                        reenableAutoScroll(true);
                     }}
                  />
               </View>

               {/* Buttons Row */}
               <View className="flex-row h-[50px] gap-3 items-center">
                  {/* Back/Close Button */}
                  <TouchableOpacity
                     onPress={handleBack}
                     className="flex-1 justify-center items-center"
                  >
                     <Text
                        className={`text-base font-semibold ${
                           idx === 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-slate-100'
                        }`}
                     >
                        {idx === 0 ? t('common.close') : t('common.back')}
                     </Text>
                  </TouchableOpacity>

                  {/* Vertical Divider */}
                  <View className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />

                  {/* Next/Finish Button */}
                  <TouchableOpacity
                     onPress={handleNext}
                     disabled={disableNext}
                     className={`flex-1 justify-center items-center ${
                        disableNext ? 'opacity-50' : 'opacity-100'
                     }`}
                  >
                     <Text
                        className={`text-base font-semibold ${
                           idx === 3
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-slate-100'
                        }`}
                     >
                        {idx === 3 ? t('common.finish') : t('common.next')}
                     </Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </Animated.View>
   );
}
