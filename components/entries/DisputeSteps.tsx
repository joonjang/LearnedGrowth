import React from 'react';
import {
   NativeScrollEvent,
   NativeSyntheticEvent,
   Pressable,
   ScrollView,
   StyleSheet,
   Text,
   TextInput,
   View,
} from 'react-native';

import EntryContextView from '@/components/newEntry/EntryContextView';
import InputBox from '@/components/newEntry/InputBox';
import PromptDisplay from '@/components/newEntry/PromptDisplay';
import StepperButton from '@/components/newEntry/StepperButton';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { NewInputDisputeType } from '@/models/newInputEntryType';
import { Entry } from '@/models/entry';

type Props = {
   entry: Entry;
   idx: number;
   currKey: NewInputDisputeType;
   prompts: Record<NewInputDisputeType, string>;
   promptTextStyle: any;
   promptMaxHeight?: number;
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
   isKeyboardVisible: boolean;
   inputBoxDims: any;
   insetsPadding: number;
   promptContainerStyle?: any;
   contextBoxStyle?: any;
   onShowInsights?: () => void;
};

export default function DisputeSteps({
   entry,
   idx,
   currKey,
   prompts,
   promptTextStyle,
   promptMaxHeight,
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
   isKeyboardVisible,
   inputBoxDims,
   insetsPadding,
   promptContainerStyle,
   contextBoxStyle,
   onShowInsights,
}: Props) {
   return (
      <>
         <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
               if (!scrollRef.current) return;
               scrollToBottom(true);
            }}
         >
            <StepperHeader
               step={idx + 1}
               total={4}
               label={currKey.charAt(0).toUpperCase() + currKey.slice(1)}
            />

            <EntryContextView
               adversity={entry.adversity}
               belief={entry.belief}
               consequence={entry.consequence ?? ''}
               style={contextBoxStyle ?? styles.contextBox}
            />
            {/* {onShowInsights ? (
               <Pressable style={styles.contextAction} onPress={onShowInsights}>
                  <View style={styles.contextActionInner}>
                     <Text style={styles.contextActionText}>View AI insight</Text>
                  </View>
               </Pressable>
            ) : null} */}

            <PromptDisplay
               text={prompts[currKey]}
               visited={hasVisited(currKey)}
               onVisited={() => markVisited(currKey)}
               textStyle={promptTextStyle}
               maxHeight={promptMaxHeight}
               scrollEnabled
               numberOfLines={6}
               containerStyle={promptContainerStyle ?? styles.promptContainer}
            />
         </ScrollView>
         <View
            style={[
               styles.inputWrapper,
               { paddingBottom: !isKeyboardVisible ? insetsPadding : 0 },
            ]}
         >
            <InputBox
               ref={inputRef}
               value={form[currKey]}
               onChangeText={setField(currKey)}
               dims={inputBoxDims}
               scrollEnabled
               onFocus={() => scrollToBottom(true)}
            />
            <StepperButton
               idx={idx}
               totalSteps={4}
               setIdx={setIdx}
               onSubmit={onSubmit}
               onExit={onExit}
               hasUnsavedChanges={hasUnsavedChanges}
               disableNext={disableNext}
            />
         </View>
      </>
   );
}

const styles = StyleSheet.create({
   scroll: { flex: 1 },
   scrollContent: {
      flexGrow: 1,
      justifyContent: 'space-between',
      gap: 16,
   },
   promptContainer: {
      flexGrow: 1,
      justifyContent: 'space-evenly',
   },
   inputWrapper: {
      paddingHorizontal: 16,
   },
   contextBox: {
      backgroundColor: '#F3F4F6',
      padding: 12,
      borderRadius: 12,
      gap: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#E5E7EB',
   },
   contextAction: {
      marginTop: 8,
   },
   contextActionInner: {
      alignSelf: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: '#e5edff',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#cbd5ff',
   },
   contextActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#1e3a8a',
   },
});
