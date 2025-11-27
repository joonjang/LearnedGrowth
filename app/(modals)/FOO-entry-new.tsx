import PromptInput from '@/components/newEntry/PromptInput';
import PromptText from '@/components/newEntry/PromptText';
import StepperButton from '@/components/newEntry/StepperButton';
import { useHeaderHeight } from '@react-navigation/elements';
import {
   Keyboard,
   KeyboardAvoidingView,
   Platform,
   ScrollView,
   StyleSheet,
   Text,
   TouchableWithoutFeedback,
   View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewEntryModal() {
   const insets = useSafeAreaInsets();
   const headerHeight = useHeaderHeight();
   const keyboardVerticalOffset = Platform.OS === 'ios' ? 40 : 0;

   return (
      <KeyboardAvoidingView
         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
         style={styles.container}
         keyboardVerticalOffset={keyboardVerticalOffset}
      >
         {/* <TouchableWithoutFeedback onPress={Keyboard.dismiss}> */}
            <View style={styles.inner}>
               <View style={styles.top}>
                  <Text>t</Text>
               </View>
               <View style={styles.middle}>
                  <ScrollView
                     style={styles.scroll}
                     keyboardDismissMode="on-drag"
                     keyboardShouldPersistTaps="handled"
                  >
                     <PromptText />
                  </ScrollView>
               </View>
               <View style={styles.bottom}>
                  <PromptInput />
                  <StepperButton />
               </View>
            </View>
         {/* </TouchableWithoutFeedback> */}
      </KeyboardAvoidingView>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
   },
   scroll: {
      flex: 1,
   },
   inner: {
      padding: 24,
      flex: 1,
      justifyContent: 'space-between',
   },
   top: {
      backgroundColor: 'yellow',
      //   flex: 1
   },
   middle: {
      backgroundColor: 'green',
      flex: 1,
   },
   bottom: {
      flexShrink: 1,
      backgroundColor: 'orange',
   },
});
