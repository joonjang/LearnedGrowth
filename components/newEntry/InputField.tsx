import { PromptLayoutVariant, usePromptLayout } from '@/features/hooks/usePromptLayout';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import InputBox from './InputBox';
import PromptDisplay from './PromptDisplay';

type Props<T extends string> = {
   value: string;
   setValue: (text: string) => void;
   entryType: T;
   prompt: string;
   visited: boolean;
   markVisited: (key: T) => void;
   variant?: PromptLayoutVariant;
   scrollEnabled?: boolean;
   onFocus?: () => void;
};

export default function InputField<T extends string>({
   value,
   setValue,
   entryType,
   prompt,
   visited,
   markVisited,
   variant = 'default',
   scrollEnabled = true,
   onFocus,
}: Props<T>) {
   const inputRef = useRef<TextInput>(null);
   const isKeyboardVisible = useKeyboardVisible();
   const { promptTextStyle, inputBoxDims, promptMaxHeight } =
      usePromptLayout(variant);

   const handleVisited = useCallback(
      () => markVisited(entryType),
      [markVisited, entryType]
   );

   const { topFlex, bottomFlex } = useMemo(() => {
      if (variant === 'compact') return { topFlex: 1, bottomFlex: 1 };
      if (isKeyboardVisible) return { topFlex: 1.4, bottomFlex: 1 };
      return { topFlex: 2.5, bottomFlex: 2 };
   }, [variant, isKeyboardVisible]);

   const topDynamicStyle = useMemo(
      () =>
         isKeyboardVisible
            ? { paddingBottom: 6 }
            : { paddingBottom: 0 },
      [isKeyboardVisible]
   );

   const scrollPrompt = variant === 'compact' && !!promptMaxHeight;

   return (
      <View style={styles.container}>
         <View style={[styles.top, { flex: topFlex }, topDynamicStyle]}>
            <PromptDisplay
               text={prompt}
               visited={visited}
               onVisited={handleVisited}
               textStyle={promptTextStyle}
               maxHeight={scrollPrompt ? promptMaxHeight : undefined}
               scrollEnabled={scrollPrompt}
               numberOfLines={scrollPrompt ? 6 : undefined}
            />
         </View>
         <View style={[styles.bottom, { flex: bottomFlex }]}>
            <InputBox
               ref={inputRef}
               value={value}
               onChangeText={setValue}
               dims={inputBoxDims}
               scrollEnabled={scrollEnabled}
               onFocus={onFocus}
            />
         </View>
      </View>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, minHeight: 0 },
   top: {
      flex: 1,
      justifyContent: 'center',
      minHeight: 0,
      paddingHorizontal: 16,
   },
   bottom: {
      paddingHorizontal: 16,
      paddingTop: 8,
      flex: 1,
      justifyContent: 'flex-end',
      minHeight: 0,
   },
});
