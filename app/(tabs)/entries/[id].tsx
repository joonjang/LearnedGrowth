import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Entry Detail Screen</Text>
      <Text>ID: {id}</Text>
    </View>
  );
}
