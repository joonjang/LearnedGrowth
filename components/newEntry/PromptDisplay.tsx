import { useDeferredReady } from '@/hooks/useDeferredReady';
import { useMemo } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { TypeAnimation } from 'react-native-type-animation';
import ThreeDotsLoader from '../ThreeDotLoader';

type Props = {
   text: string;
   visited: boolean;
   onVisited?: () => void;
   textStyle: TextStyle;
   containerStyle?: StyleProp<ViewStyle>;
   numberOfLines?: number;
   maxHeight?: number;
   scrollEnabled?: boolean;
};

export default function PromptDisplay({
   text,
   visited,
   onVisited,
   textStyle,
   containerStyle,
   numberOfLines,
   maxHeight,
   scrollEnabled = false,
}: Props) {
   const readyToAnimate = useDeferredReady(1200);
   const mergedStyle = useMemo(
      () => [styles.promptText, textStyle],
      [textStyle]
   );
   const flatStyle = useMemo(
      () => StyleSheet.flatten(mergedStyle) as TextStyle,
      [mergedStyle]
   );

   const sequence = [
      { text },
      {
         action: () => onVisited?.(),
      },
   ];

   const loader = (
      <View
         style={[
            styles.loaderBase,
         ]}
      >
         <ThreeDotsLoader />
      </View>
   );

   const content = visited ? (
      <Text
         style={mergedStyle}
         numberOfLines={numberOfLines}
         adjustsFontSizeToFit
         minimumFontScale={0.85}
         allowFontScaling
      >
         {text}
      </Text>
   ) : readyToAnimate ? (
      <TypeAnimation
         key={text}
         sequence={sequence}
         cursor={false}
         typeSpeed={50}
         style={flatStyle}
         cursorStyle={flatStyle}
      />
   ) : (
      loader
   );

   if (!scrollEnabled) {
      return <View style={[styles.container, containerStyle]}>{content}</View>;
   }

   return (
      <View
         style={[
            styles.container,
            containerStyle,
            maxHeight ? { maxHeight, overflow: 'hidden' } : null,
         ]}
      >
         <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            bounces={false}
         >
            {content}
         </ScrollView>
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      justifyContent: 'center',
      minHeight: 0,
      paddingHorizontal: 16,
      alignSelf: 'stretch',
      width: '100%',
      paddingBottom: 16
   },
   promptText: {
      fontWeight: '600',
      flexShrink: 1,
      flexWrap: 'wrap',
   },
   scroll: {
      flexGrow: 0,
   },
   scrollContent: {
      flexGrow: 0,
      paddingVertical: 12,
   },
   loaderBase: {
      alignItems: 'center',
      minHeight: 1,
   }
});
