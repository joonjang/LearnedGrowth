import { ThemedStack } from "@/theme/Navigation";
import { Stack } from "expo-router";
export default function EntriesStack() {
  return (
    <ThemedStack>
      <Stack.Screen name="index" options={{ title: "Entries" }} />
      <Stack.Screen name="[id]" options={{ title: "Entry" }} />
    </ThemedStack>
  );
}
