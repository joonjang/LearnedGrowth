import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-900"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 20,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700">
        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t('summary.title')}
        </Text>
        <Text className="mt-2 text-base text-slate-600 dark:text-slate-300">
          {t('summary.subtitle')}
        </Text>
      </View>
    </ScrollView>
  );
}
