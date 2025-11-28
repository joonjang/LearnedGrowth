import { useEffect, useState } from 'react';
import {
   KeyboardController,
   KeyboardEvents,
} from 'react-native-keyboard-controller';

export function useKeyboardVisible() {
   const [visible, setVisible] = useState(
      () => KeyboardController.isVisible?.() ?? false
   );

   useEffect(() => {
      const showSub = KeyboardEvents.addListener('keyboardWillShow', () =>
         setVisible(true)
      );
      const didShowSub = KeyboardEvents.addListener('keyboardDidShow', () =>
         setVisible(true)
      );
      const willHideSub = KeyboardEvents.addListener('keyboardWillHide', () =>
         setVisible(false)
      );
      const hideSub = KeyboardEvents.addListener('keyboardDidHide', () =>
         setVisible(false)
      );

      return () => {
         showSub.remove();
         didShowSub.remove();
         willHideSub.remove();
         hideSub.remove();
      };
   }, []);

   return visible;
}
