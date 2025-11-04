import { useRef } from 'react';
import {
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Pressable,
  TextInput,
  Text,
  View,
} from 'react-native';
import { TypeAnimation } from 'react-native-type-animation';
import { EntryType } from '@/app/(modals)/entry-new';

type Props = {
  value: string;
  setValue: (text: string) => void;
  entryType: EntryType;
  prompt: string;
  visited: boolean;
  setVisited: (v: React.SetStateAction<Record<EntryType, boolean>>) => void;
};

export default function InputField({
  value, setValue, entryType, prompt, visited, setVisited,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  const sequence = [
    { text: prompt },
    { action: () => setVisited(v => (v[entryType] ? v : { ...v, [entryType]: true })) },
  ];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        {/* Top section */}
        <View style={{ flex: 1, paddingRight: 4 }}>
          <View style={{ flexDirection: 'row' }}>
            {visited ? (
              <Text style={{ fontSize: 50 }}>{prompt}</Text>
            ) : (
              <TypeAnimation
                sequence={sequence}
                cursor={false}
                delayBetweenSequence={2000}
                typeSpeed={50}
                style={{ fontSize: 50 }}
              />
            )}
          </View>
        </View>

        {/* Bottom section (fills remaining space) */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}   
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View style={{ flex: 1 }}>                    
            <Pressable
              onPress={() => inputRef.current?.focus()}
              style={{
                flex: 1,
                backgroundColor: '#e3e3e3ff',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <TextInput
                ref={inputRef}
                placeholder="Enter here"
                value={value}
                onChangeText={setValue}
                style={{ fontSize: 20, flex: 1 }}
                multiline
                textAlignVertical="top"
              />
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}
