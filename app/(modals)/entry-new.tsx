import InputField from '@/components/newEntry/InputField';
import { useEntries } from '@/features/hooks/useEntries';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableWithoutFeedback,
  View,
  StyleSheet,
} from 'react-native';
import rawAbcde from '@/assets/data/abcde.json';
// import rawAbcde from '@/assets/data/abcdeDev.json';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NewInputEntryType } from '@/models/newInputEntryType';


const STEP_ORDER = ['adversity', 'belief', 'consequence'] as const;
const STEP_LABEL: Record<NewInputEntryType, string> = {
  adversity: 'Adversity',
  belief: 'Belief',
  consequence: 'Consequence',
};

function pickRandomPrompt(list?: string[]) {
  if (!list?.length) return 'Empty JSON';
  const i = Math.floor(Math.random() * list.length);
  return list[i];
}

export default function NewEntryModal() {
  const store = useEntries();
  const headerHeight = useHeaderHeight();

  const [visited, setVisited] = useState<Set<NewInputEntryType>>(new Set());
  const [form, setForm] = useState<Record<NewInputEntryType, string>>({
    adversity: '',
    belief: '',
    consequence: '',
  });

  const prompts = useMemo<Record<NewInputEntryType, string>>(
    () => ({
      adversity: pickRandomPrompt(rawAbcde.adversity),
      belief: pickRandomPrompt(rawAbcde.belief),
      consequence: pickRandomPrompt(rawAbcde.consequence),
    }),
    []
  );

  const [idx, setIdx] = useState(0);
  const currKey = STEP_ORDER[idx] as NewInputEntryType;

  const setField = useCallback(
    (k: NewInputEntryType) => (v: string) => setForm((f) => ({ ...f, [k]: v })),
    []
  );

  const canGoBack = idx > 0;
  const isLast = idx === STEP_ORDER.length - 1;
  const currentEmpty = !form[currKey]?.trim();

  function onNext() {
    if (isLast) submit();
    else setIdx((i) => i + 1);
  }

  function onBack() {
    if (canGoBack) setIdx((i) => i - 1);
  }

  const submit = useCallback(() => {
    const { adversity, belief, consequence } = form;
    store.createEntry(adversity, belief, consequence);
    router.back();
  }, [form, store]);

  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? headerHeight : 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="page" style={styles.page}>
          {/* Progress header */}
          <Text style={styles.headerText}>
            Step {idx + 1} of {STEP_ORDER.length} — {STEP_LABEL[currKey]}
          </Text>

          <View style={styles.content}>
            <InputField
              key={currKey}
              value={form[currKey]}
              setValue={setField(currKey)}
              entryType={currKey}
              prompt={prompts[currKey]}
              visited={visited.has(currKey)}
              setVisited={setVisited}
            />
          </View>

          {/* Nav actions */}
          <View style={[styles.actionsRow, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.actionCol}>
              <Button title="Back" onPress={onBack} disabled={!canGoBack} />
            </View>
            <View style={styles.actionCol}>
              <Button
                title={isLast ? 'Finish' : 'Next'}
                onPress={onNext}
                disabled={currentEmpty}
                color={isLast ? 'red' : undefined}
              />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { padding: 20, flex: 1, gap: 16 },
  headerText: { fontSize: 16 },
  content: { flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    minHeight: 64,
    maxHeight: 140,
    alignItems: 'center',
  },
  actionCol: { flex: 1 },
});
