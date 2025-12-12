import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 20,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="rounded-2xl bg-card dark:bg-card-dark p-5 border border-border dark:border-border-dark">
        <Text className="text-lg font-semibold text-primary dark:text-primary-dark">
          Summary
        </Text>
        <Text className="mt-2 text-base text-textSubtle dark:text-textSubtle-dark">
          Your insights and progress will appear here. Scroll to explore
          highlights, trends, and quick actions.
        </Text>
      </View>
    </ScrollView>
  );
}
