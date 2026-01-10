import LottieView from "lottie-react-native";
import React from "react";
import { useColorScheme } from "nativewind";
import { View } from "react-native";

export default function ThreeDotsLoader() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View className="flex-1 justify-center items-center">
      <LottieView
        source={
          isDark
            ? require("@/assets/animations/three-dots-loading-dark.json")
            : require("@/assets/animations/three-dots-loading.json")
        }
        autoPlay
        loop
        style={{ width: 80, height: 40 }}
      />
    </View>
  );
}
