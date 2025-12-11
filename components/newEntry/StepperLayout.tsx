import React, { ReactNode, RefObject } from 'react';
import {
   ScrollViewProps,
   StyleProp,
   StyleSheet,
   TextStyle,
   TouchableWithoutFeedback,
   View,
   ViewStyle,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ScrollView } from 'react-native-gesture-handler';
import StepperHeader from './StepperHeader';
import PromptDisplay from './PromptDisplay';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeThemedStyles } from '@/theme/theme';

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
   extraContent?: ReactNode;
   scrollRef?: RefObject<ScrollView | null>;
   scrollProps?: ScrollViewProps;
   onBackgroundPress?: () => void;
   ai?: string;
};

export default function StepperLayout({
   step,
   totalSteps,
   label,
   prompt,
   inputSection,
   extraContent,
   scrollRef,
   scrollProps,
   onBackgroundPress,
}: StepperLayoutProps) {
   const { contentContainerStyle, ...restScrollProps } = scrollProps ?? {};
   const insets = useSafeAreaInsets();
   const styles = useStyles();
   const pageContent = (
      <View style={styles.page}>
         <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
               styles.scrollContent,
               { paddingTop: 24 },
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
      <KeyboardAvoidingView
         style={styles.root}
         behavior="padding"
         keyboardVerticalOffset={insets.bottom + 24}
      >
         {onBackgroundPress ? (
            <TouchableWithoutFeedback
               onPress={onBackgroundPress}
               accessible={false}
            >
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
   const styles = useStyles();

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

const useStyles = makeThemedStyles(({ colors }) =>
   StyleSheet.create({
      root: { flex: 1, backgroundColor: colors.background },
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
   })
);
