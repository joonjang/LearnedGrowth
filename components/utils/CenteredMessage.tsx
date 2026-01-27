import { ReactNode } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function CenteredMessage({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>{message}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}
