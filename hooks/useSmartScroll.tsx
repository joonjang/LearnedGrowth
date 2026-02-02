import { useCallback, useRef } from 'react';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
} from 'react-native';

export function useSmartScroll() {
   const scrollRef = useRef<ScrollView>(null);
   const autoScrollEnabledRef = useRef(true);
   const isUserScrollingRef = useRef(false);

   const scrollToBottom = useCallback((animated = true) => {
      scrollRef.current?.scrollToEnd({ animated });
   }, []);

   const reenableAutoScroll = useCallback(
      (animated = false) => {
         autoScrollEnabledRef.current = true;
         if (animated) {
            scrollToBottom(true);
         }
      },
      [scrollToBottom],
   );

   const updateAutoScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
         const { layoutMeasurement, contentOffset, contentSize } =
            event.nativeEvent;
         const paddingToBottom = 24;
         const isAtBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom;

         if (isAtBottom) {
            if (!autoScrollEnabledRef.current) {
               autoScrollEnabledRef.current = true;
               scrollToBottom(true);
            }
         } else {
            autoScrollEnabledRef.current = false;
         }
      },
      [scrollToBottom],
   );

   const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
         if (!isUserScrollingRef.current) return;
         updateAutoScroll(event);
      },
      [updateAutoScroll],
   );

   // Props to spread onto the ScrollView
   const scrollProps = {
      ref: scrollRef,
      scrollEventThrottle: 16,
      onScroll: handleScroll,
      onScrollBeginDrag: () => {
         isUserScrollingRef.current = true;
      },
      onScrollEndDrag: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
         isUserScrollingRef.current = false;
         updateAutoScroll(e);
      },
      onMomentumScrollBegin: () => {
         isUserScrollingRef.current = true;
      },
      onMomentumScrollEnd: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
         isUserScrollingRef.current = false;
         updateAutoScroll(e);
      },
      onContentSizeChange: () => {
         if (autoScrollEnabledRef.current) {
            scrollToBottom(true);
         }
      },
   };

   return {
      scrollRef,
      scrollProps,
      scrollToBottom,
      reenableAutoScroll,
      setAutoScrollEnabled: (enabled: boolean) => {
         autoScrollEnabledRef.current = enabled;
      },
   };
}
