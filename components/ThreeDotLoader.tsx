import LottieView from "lottie-react-native";
import React from "react";
import { View } from "react-native";

export default function ThreeDotsLoader() {
  return (
    <View className="flex-1 justify-center items-center">
      <LottieView
        source={require("@/assets/animations/three-dots-loading.json")}
        autoPlay
        loop
        style={{ width: 80, height: 40 }}
      />
    </View>
  );
}