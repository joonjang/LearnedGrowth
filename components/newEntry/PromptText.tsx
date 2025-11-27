import { useDeferredReady } from "@/features/hooks/useDeferredReady";
import ThreeDotsLoader from "../ThreeDotLoader";
import { TypeAnimation } from "react-native-type-animation";
import { StyleSheet } from "react-native";
import { useKeyboardVisible } from "@/features/hooks/useKeyboardVisible";
import { useMemo } from "react";
import { useResponsiveFont } from "@/features/hooks/useResponsiveFont";
  
const debug = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
const debug1 = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'

export default function PromptText(){
    const readyToAnimate = useDeferredReady(1200);
    const isKeyboardVisible = useKeyboardVisible();
    const { scaleFont } = useResponsiveFont();

    const { baseFont, minFont } = useMemo(() => {
          return {
             baseFont: scaleFont(38, { min: 26, max: 48, factor: 0.4 }),
             minFont: scaleFont(30, { min: 22, max: 40, factor: 0.4 }),
          };
       }, [scaleFont]);

    const promptTextStyle = {
      ...styles.promptText,
      ...{ fontSize: isKeyboardVisible ? minFont : baseFont },
   };

   const sequence = useMemo(
         () => [
            { text: debug },
            {
               action: () =>
                //   setVisited((prev) => {
                //      if (prev.has(entryType)) return prev;
                //      const next = new Set(prev);
                //      next.add(entryType);
                //      return next;
                //   })
                  {},
            },
         ],
         [debug]
      );

    if(readyToAnimate) return <TypeAnimation
                  sequence={sequence}
                  cursor={false}
                  typeSpeed={50}
                  style={promptTextStyle} 
               />

    return <ThreeDotsLoader/>
}

const styles = StyleSheet.create({
    promptText: {
      fontWeight: '600',
    //   flexShrink: 1,
   },
});