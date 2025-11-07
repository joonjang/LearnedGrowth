import InputField from '@/components/entries/InputField';
import { useEntries } from '@/features/hooks/useEntries';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Button, Keyboard, KeyboardAvoidingView, Platform, Text, TouchableWithoutFeedback, View } from 'react-native';
import rawAbcde from '@/assets/data/abcde.json';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type EntryType = 'adversity' | 'belief' | 'consequence';

export default function NewEntryModal() {
   const store = useEntries();
   const [form, setForm] = useState<Record<EntryType, string>>({
      adversity: '',
      belief: '',
      consequence: '',
   });

   const [visited, setVisited] = useState<Record<EntryType, boolean>>({
      adversity: false,
      belief: false,
      consequence: false,
   });

   const steps: { key: EntryType; label: string }[] = useMemo(
      () => [
         { key: 'adversity', label: 'Adversity' },
         { key: 'belief', label: 'Belief' },
         { key: 'consequence', label: 'Consequence' },
      ],
      []
   );

   const [prompts] = useState<Record<EntryType, string>>(() => {
      const pick = (k: EntryType) => {
         const list = rawAbcde[k] ?? [];
         return list.length
            ? list[Math.floor(Math.random() * list.length)]
            : 'Empty JSON';
      };
      return {
         adversity: pick('adversity'),
         belief: pick('belief'),
         consequence: pick('consequence'),
      };
   });

   const [idx, setIdx] = useState(0);
   const curr = steps[idx];


   const setField =
      (k: EntryType) =>
      (v: string): void =>
         setForm((f) => ({ ...f, [k]: v }));

   const canGoBack = idx > 0;
   const isLast = idx === steps.length - 1;
   const currentEmpty = !form[curr.key]?.trim();

   function onNext() {
     if(idx == 2) submit();
     else setIdx((i) => i + 1);
   }

   function onBack() {
      if (canGoBack) setIdx((i) => i - 1);
   }

   function submit() {
      store.createEntry(form.adversity, form.belief, form.consequence);
      router.back();
   }

    const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const keyboardVerticalOffset =
    Platform.OS === 'ios'
      ? headerHeight // if modal has header
      : 0;

   return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ padding: 20, flex: 1, gap: 16 }}>
         {/* Progress header */}
         <Text style={{ fontSize: 16 }}>
            Step {idx + 1} of {steps.length} — {curr.label}
         </Text>

         {/* Reuse your existing InputField */}
         <View style={{ flex: 1 }}>
          
            <InputField
               key={curr.key}
               value={form[curr.key]}
               setValue={setField(curr.key)}
               entryType={curr.key}
               prompt={prompts[curr.key]}
               visited={visited[curr.key]}
               setVisited={setVisited}
            />
           
         </View>

         {/* Nav actions */}
         <View
            style={{
              flex: 0.25,
               flexDirection: 'row',
               gap: 12,
               justifyContent: 'space-between',
            }}
         >
            <View style={{ flex: 1 }}>
               <Button title="Back" onPress={onBack} disabled={!canGoBack} />
            </View>
            <View style={{ flex: 1 }}>
               <Button
                  title={isLast ? 'Finish' : 'Next'}
                  onPress={onNext}
                  disabled={currentEmpty}
                  color={isLast ? 'green' : undefined}
               />
            </View>
         </View>
      </View>
      </TouchableWithoutFeedback>
       </KeyboardAvoidingView>
   );
}
