import React, { useCallback } from 'react';
import {
   NativeScrollEvent,
   NativeSyntheticEvent,
   ScrollView,
   StyleProp,
   TextInput,
   TextStyle,
   View,
   ViewStyle
} from 'react-native';
import { AnimatedStyle } from 'react-native-reanimated';

import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import StepperButton from '@/components/buttons/StepperButton';
import EntryContextView from '@/components/entries/dispute/EntryContextView';
import InputBox from '@/components/newEntry/InputBox';
import PromptDisplay, { PromptDisplayHandle } from '@/components/newEntry/PromptDisplay';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { DISPUTE_STEP_CHAR_LIMITS } from '@/components/constants';
import { Entry } from '@/models/entry';
import { NewInputDisputeType } from '@/models/newInputEntryType';

const DISPUTE_STEP_ORDER: NewInputDisputeType[] = [
   'evidence',
   'alternatives',
   'usefulness',
   'energy',
];

const DISPUTE_PLACEHOLDER: Partial<Record<NewInputDisputeType, string>> = {
   evidence: 'Separate facts from assumptions',
   alternatives: 'Describe another way to see it',
   usefulness: 'Impact on goals and actions',
   energy: 'Note any shift in mood or energy',
};

type Props = {
   entry: Entry;
   idx: number;
   currKey: NewInputDisputeType;
   prompts: Record<NewInputDisputeType, string>;
   promptTextStyle: TextStyle;
   promptTextAnimatedStyle?: AnimatedStyle<TextStyle>;
   promptTextMeasureStyle?: AnimatedStyle<TextStyle>;
   promptLineBreakKey?: string | number;
   promptContainerAnimatedStyle?: AnimatedStyle<ViewStyle>;
   hasVisited: (key: NewInputDisputeType) => boolean;
   markVisited: (key: NewInputDisputeType) => void;
   form: Record<NewInputDisputeType, string>;
   setField: (k: NewInputDisputeType) => (v: string) => void;
   setIdx: React.Dispatch<React.SetStateAction<number>>;
   onSubmit: () => void;
   onExit: () => void;
   disableNext: boolean;
   hasUnsavedChanges: boolean;
   scrollRef: React.RefObject<ScrollView | null>;
   handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
   scrollToBottom: (animated?: boolean) => void;
   inputRef: React.RefObject<TextInput | null>;
   inputBoxDims: { minHeight?: number; maxHeight?: number };
   inputBoxAnimatedStyle?: AnimatedStyle<ViewStyle>;
   promptContainerStyle?: StyleProp<ViewStyle>;
   contentTopPadding?: number;
};

export default function DisputeSteps({
   entry,
   idx,
   currKey,
   prompts,
   promptTextStyle,
   promptTextAnimatedStyle,
   promptTextMeasureStyle,
   promptLineBreakKey,
   promptContainerAnimatedStyle,
   hasVisited,
   markVisited,
   form,
   setField,
   setIdx,
   onSubmit,
   onExit,
   disableNext,
   hasUnsavedChanges,
   scrollRef,
   handleScroll,
   scrollToBottom,
   inputRef,
   inputBoxDims,
   inputBoxAnimatedStyle,
   promptContainerStyle,
   contentTopPadding,
}: Props) {
   const shadowGutter = 6;
   const promptRef = React.useRef<PromptDisplayHandle | null>(null);

   const handleClose = useCallback(() => {
      onExit();
   }, [onExit]);

   const handleStepChange = useCallback(
      (direction: 'next' | 'back') => {
         promptRef.current?.stop({ finish: true });
         const delta = direction === 'next' ? 1 : -1;
         const nextIdx = Math.min(
            Math.max(idx + delta, 0),
            DISPUTE_STEP_ORDER.length - 1
         );
         const nextKey = DISPUTE_STEP_ORDER[nextIdx];
         inputRef.current?.setNativeProps({ text: form[nextKey] ?? '' });
         setIdx(nextIdx);
      },
      [form, idx, inputRef, setIdx]
   );

   return (
      <>
         <ScrollView
            ref={scrollRef}
            className="flex-1"
            style={{ marginHorizontal: -shadowGutter }}
            contentContainerStyle={{
               flexGrow: 1,
               justifyContent: 'space-between',
               gap: 16,
               paddingTop: contentTopPadding ?? 24,
               paddingHorizontal: shadowGutter,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
               if (!scrollRef.current) return;
               scrollToBottom(true);
            }}
         >
            {/* --- HEADER ROW --- */}
            <View className="flex-row items-center mb-2">
               <View className="flex-1 mr-2">
                  <StepperHeader
                     step={idx + 1}
                     total={4}
                     label={currKey.charAt(0).toUpperCase() + currKey.slice(1)}
                  />
               </View>

               <RoundedCloseButton onPress={handleClose} />
            </View>

            <EntryContextView
               adversity={entry.adversity}
               belief={entry.belief}
               consequence={entry.consequence ?? ''}
            />

            <PromptDisplay
               ref={promptRef}
               text={prompts[currKey]}
               visited={hasVisited(currKey)}
               onVisited={() => markVisited(currKey)}
               textStyle={promptTextStyle}
               textAnimatedStyle={promptTextAnimatedStyle}
               textMeasureStyle={promptTextMeasureStyle}
               lineBreakKey={promptLineBreakKey}
               containerAnimatedStyle={promptContainerAnimatedStyle}
               freezeLineBreaks
               scrollEnabled
               numberOfLines={6}
               containerStyle={promptContainerStyle ?? { flexGrow: 1, justifyContent: 'space-evenly' }}
            />
         </ScrollView>

         {/* --- INPUT WRAPPER --- */}

            <InputBox

               ref={inputRef}
               value={form[currKey]}
               onChangeText={setField(currKey)}
               placeholder={DISPUTE_PLACEHOLDER[currKey]}
               maxLength={DISPUTE_STEP_CHAR_LIMITS[currKey]}
               dims={inputBoxDims}
               animatedStyle={inputBoxAnimatedStyle}
               scrollEnabled
               compact
               onFocus={() => scrollToBottom(true)}
               
            />
            <StepperButton
               idx={idx}
               totalSteps={4}
               setIdx={setIdx}
               onSubmit={onSubmit}
               onExit={onExit}
               disableNext={disableNext}
               inputRef={inputRef}
               onNext={() => handleStepChange('next')}
               onBack={() => handleStepChange('back')}
            />

      </>
   );
}
