import React, { ReactNode, RefObject } from 'react';
import {
   StyleProp,
   StyleSheet,
   TextStyle,
   TouchableWithoutFeedback,
   View,
   ViewStyle,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
   ScrollView,
   ScrollViewProps,
} from 'react-native-gesture-handler';
import StepperHeader from './StepperHeader';
import PromptDisplay from './PromptDisplay';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';

type PromptContentProps = {
   text: string;
   visited: boolean;
   onVisited?: () => void;
   textStyle: TextStyle;
   maxHeight?: number;
   numberOfLines?: number;
   scrollEnabled?: boolean;
   containerStyle?: StyleProp<ViewStyle>;
};

type StepperLayoutProps = {
   step: number;
   totalSteps: number;
   label: string;
   prompt: PromptContentProps;
   inputSection: ReactNode;
   topInset: number;
   extraContent?: ReactNode;
   scrollRef?: RefObject<ScrollView | null>;
   scrollProps?: ScrollViewProps;
   onBackgroundPress?: () => void;
};

export default function StepperLayout({
   step,
   totalSteps,
   label,
   prompt,
   inputSection,
   topInset,
   extraContent,
   scrollRef,
   scrollProps,
   onBackgroundPress,
}: StepperLayoutProps) {
   const { contentContainerStyle, ...restScrollProps } = scrollProps ?? {};

   const pageContent = (
      <View style={styles.page}>
         <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
               styles.scrollContent,
               { paddingTop: topInset + 12 },
               contentContainerStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            {...restScrollProps}
         >
            <StepperHeader step={step} total={totalSteps} label={label} />
            {extraContent}
            <PromptDisplay
               {...prompt}
               containerStyle={[styles.promptContainer, prompt.containerStyle]}
            />
         </ScrollView>
         {inputSection}
      </View>
   );

   return (
      <KeyboardAvoidingView style={styles.root} behavior="padding">
         {onBackgroundPress ? (
            <TouchableWithoutFeedback onPress={onBackgroundPress} accessible={false}>
               {pageContent}
            </TouchableWithoutFeedback>
         ) : (
            pageContent
         )}
      </KeyboardAvoidingView>
   );
}

type InputWrapperProps = {
   children: ReactNode;
   style?: StyleProp<ViewStyle>;
};

export function KeyboardAwareInputWrapper({
   children,
   style,
}: InputWrapperProps) {
   const isKeyboardVisible = useKeyboardVisible();

   return (
      <View
         style={[
            styles.inputWrapper,
            style,
            { paddingBottom: !isKeyboardVisible ? 24 : 0 },
         ]}
      >
         {children}
      </View>
   );
}

const styles = StyleSheet.create({
   root: { flex: 1, backgroundColor: '#fff' },
   page: {
      flex: 1,
      paddingHorizontal: 20,
   },
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
});
