// components/ThreeDotsLoader.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";

export default function ThreeDotsLoader() {
  return (
    <View style={styles.container}>
      <LottieView
        source={require("@/assets/animations/three-dots-loading.json")}
        autoPlay
        loop
        style={{ width: 80, height: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
  },
});
