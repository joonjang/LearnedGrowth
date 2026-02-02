import React, { useEffect, useRef } from 'react';
import {
   ScrollView,
   Text,
   TextInput,
   TouchableOpacity,
   useWindowDimensions,
   View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import SmartInput from '@/components/SmartInput';
import TypewriterText, { TypewriterHandle } from '@/components/TypewriterText';
import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import EntryContextView from '@/components/entries/dispute/EntryContextView';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { useSmartScroll } from '@/hooks/useSmartScroll'; // <--- The Hook
import { useSmoothKeyboard } from '@/hooks/useSmoothKeyboard';

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

   // 1. USE SMART SCROLL HOOK (Replaces all manual refs/handlers)
   const { scrollProps, reenableAutoScroll, scrollToBottom } = useSmartScroll();

   // 2. KEYBOARD ANIMATION (Constraint logic)
   const { height: screenHeight } = useWindowDimensions();
   const maxInputHeight = Math.floor(screenHeight * 0.25);
   const { animatedPromptStyle, animatedInputStyle, animatedWrapperStyle } =
      useSmoothKeyboard({
         closedHeight: maxInputHeight,
      });

   // Reset scroll on step change
   useEffect(() => {
      reenableAutoScroll();
      requestAnimationFrame(() => scrollToBottom(false));
   }, [idx, reenableAutoScroll, scrollToBottom]);

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
      <Animated.View style={[{ flex: 1 }, animatedWrapperStyle]}>
         <View style={{ flex: 1 }}>
            {/* Main Scrollable Area */}
            <ScrollView
               {...scrollProps} // <--- Spread the hook props here
               showsVerticalScrollIndicator={false}
               contentContainerStyle={{
                  flexGrow: 1,
                  paddingTop: contentTopPadding,
                  paddingHorizontal: 20,
               }}
            >
               {/* HEADER */}
               <View
                  style={{
                     flexDirection: 'row',
                     alignItems: 'center',
                     marginBottom: 10,
                  }}
               >
                  <View style={{ flex: 1, marginRight: 8 }}>
                     <StepperHeader
                        step={idx + 1}
                        total={4}
                        label={
                           currKey.charAt(0).toUpperCase() + currKey.slice(1)
                        }
                     />
                  </View>
                  <RoundedCloseButton onPress={onExit} />
               </View>

               {/* CONTEXT CARD */}
               <View style={{ marginBottom: 16 }}>
                  <EntryContextView
                     adversity={entry.adversity}
                     belief={entry.belief}
                     consequence={entry.consequence ?? ''}
                  />
               </View>

               {/* PROMPT (Vertically Centered) */}
               <View style={{ flex: 1, justifyContent: 'center' }}>
                  <TypewriterText
                     ref={typewriterRef}
                     text={prompts[currKey]}
                     visited={hasVisited(currKey)}
                     onFinished={() => markVisited(currKey)}
                     style={[
                        { fontWeight: '700', color: '#0f172a' },
                        animatedPromptStyle,
                     ]}
                  />
               </View>

               <View style={{ height: 20 }} />
            </ScrollView>

            {/* FOOTER */}
            <View style={{ paddingHorizontal: 20 }}>
               <View style={{ marginBottom: 10, marginTop: 10 }}>
                  <SmartInput
                     ref={inputRef}
                     value={form[currKey]}
                     onChangeText={setField(currKey)}
                     placeholder="Type here..."
                     animatedStyle={animatedInputStyle}
                     onFocus={() => {
                        reenableAutoScroll(true);
                     }}
                  />
               </View>

               <View
                  style={{
                     flexDirection: 'row',
                     height: 50,
                     gap: 12,
                     alignItems: 'center',
                  }}
               >
                  <TouchableOpacity
                     onPress={handleBack}
                     style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                     }}
                  >
                     <Text
                        style={{
                           fontSize: 16,
                           fontWeight: '600',
                           color: idx === 0 ? '#e11d48' : '#64748b',
                        }}
                     >
                        {idx === 0 ? 'Close' : 'Back'}
                     </Text>
                  </TouchableOpacity>

                  <View
                     style={{
                        width: 1,
                        height: 24,
                        backgroundColor: '#e2e8f0',
                     }}
                  />

                  <TouchableOpacity
                     onPress={handleNext}
                     disabled={disableNext}
                     style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: disableNext ? 0.5 : 1,
                     }}
                  >
                     <Text
                        style={{
                           fontSize: 16,
                           fontWeight: '600',
                           color: idx === 3 ? '#e11d48' : '#0f172a',
                        }}
                     >
                        {idx === 3 ? 'Finish' : 'Next'}
                     </Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </Animated.View>
   );
}
