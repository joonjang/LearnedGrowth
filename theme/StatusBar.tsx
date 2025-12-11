import { StatusBar, type StatusBarStyle } from "expo-status-bar";

import { useTheme } from "./theme";

export function ThemedStatusBar() {
  const { mode } = useTheme();
  const isDarkMode = mode === "dark";

  const backgroundColor = "transparent";
  const statusBarStyle: StatusBarStyle = isDarkMode ? "light" : "dark";

  return (
    <StatusBar
      style={statusBarStyle}
      backgroundColor={backgroundColor}
      translucent
      animated
    />
  );
}
