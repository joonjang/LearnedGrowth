import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import React, { useCallback } from 'react';
import {
   Alert,
   Keyboard,
   NativeScrollEvent,
   NativeSyntheticEvent,
   Pressable,
   ScrollView,
   TextInput,
   View,
} from 'react-native';

import EntryContextView from '@/components/entries/dispute/EntryContextView';
import InputBox from '@/components/newEntry/InputBox';
import PromptDisplay from '@/components/newEntry/PromptDisplay';
import StepperButton from '@/components/newEntry/StepperButton';
import StepperHeader from '@/components/newEntry/StepperHeader';
import { Entry } from '@/models/entry';
import { NewInputDisputeType } from '@/models/newInputEntryType';

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
   promptContainerStyle?: any;
   contentTopPadding?: number;
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
   promptContainerStyle,
   contentTopPadding,
}: Props) {
   
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#f8fafc' : '#0f172a'; // text vs text-inverse

   const handleClose = useCallback(() => {
      if (!hasUnsavedChanges) {
         onExit();
         return;
      }
      Keyboard.dismiss();
      Alert.alert(
         'Discard changes?',
         'You have unsaved changes. Close without saving?',
         [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => onExit() },
         ]
      );
   }, [hasUnsavedChanges, onExit]);

   return (
      <>
         <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{
               flexGrow: 1,
               justifyContent: 'space-between',
               gap: 16,
               paddingTop: contentTopPadding ?? 24
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

               <Pressable
                  onPress={handleClose}
                  hitSlop={12}
                  className="p-2 rounded-2xl border border-border bg-card-bg items-center justify-center active:opacity-70"
               >
                  <Ionicons name="close" size={22} color={iconColor} />
               </Pressable>
            </View>

            <EntryContextView
               adversity={entry.adversity}
               belief={entry.belief}
               consequence={entry.consequence ?? ''}
            />

            <PromptDisplay
               text={prompts[currKey]}
               visited={hasVisited(currKey)}
               onVisited={() => markVisited(currKey)}
               textStyle={promptTextStyle}
               maxHeight={promptMaxHeight}
               scrollEnabled
               numberOfLines={6}
               containerStyle={promptContainerStyle ?? { flexGrow: 1, justifyContent: 'space-evenly' }}
            />
         </ScrollView>

         {/* --- INPUT WRAPPER --- */}
         <View 
            style={{ paddingBottom: !isKeyboardVisible ? 16 : 0 }}
         >
            <InputBox
               ref={inputRef}
               value={form[currKey]}
               onChangeText={setField(currKey)}
               dims={inputBoxDims}
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
               hasUnsavedChanges={hasUnsavedChanges}
               disableNext={disableNext}
            />
         </View>
      </>
   );
}