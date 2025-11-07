import { useRef, useState, useEffect } from 'react';
import {
  Pressable,
  TextInput,
  Text,
  View,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { TypeAnimation } from 'react-native-type-animation';
import { EntryType } from '@/app/(modals)/entry-new';
import { useDeferredReady } from '@/features/hooks/useDeferredReady';
import ThreeDotsLoader from '../ThreeDotLoader';

type Props = {
  value: string;
  setValue: (text: string) => void;
  entryType: EntryType;
  prompt: string;
  visited: boolean;
  setVisited: (v: React.SetStateAction<Record<EntryType, boolean>>) => void;
};

export default function InputField({
  value,
  setValue,
  entryType,
  prompt,
  visited,
  setVisited,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const readyToAnimate = useDeferredReady(1200);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sequence = [
    { text: prompt },
    {
      action: () => {
        setVisited(v => (v[entryType] ? v : { ...v, [entryType]: true }));
      },
    },
  ];

  // 🔍 Adjust font size based on keyboard state
  const promptFontSize = isKeyboardVisible ? 40 : 50;

  return (
    <View style={styles.container}>
      {/* Top: prompt / animation */}
      <View style={styles.promptContainer}>
        {visited ? (
          <Text style={[styles.promptText, { fontSize: promptFontSize }]}>
            {prompt}
          </Text>
        ) : readyToAnimate ? (
          <TypeAnimation
            sequence={sequence}
            cursor={false}
            typeSpeed={50}
            style={{ ...styles.promptText, fontSize: promptFontSize }}
          />
        ) : (
          <ThreeDotsLoader />
        )}
      </View>

      {/* Bottom: input */}
      <View style={styles.inputContainer}>
        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={styles.inputBox}
        >
          <TextInput
            ref={inputRef}
            placeholder="Enter here"
            value={value}
            onChangeText={setValue}
            style={styles.inputText}
            multiline
            textAlignVertical="top"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  promptContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  promptText: {
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  inputContainer: {
    flex: 1,
  },
  inputBox: {
    flex: 1,
    backgroundColor: '#e3e3e3ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputText: {
    flex: 1,
    fontSize: 18,
  },
});
