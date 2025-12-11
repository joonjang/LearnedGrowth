import { StyleSheet } from "react-native";
import { DarkColors, LightColors, type ThemeColors, type ThemeMode } from "./colors";

export const createShadowStyles = (mode: ThemeMode, colors: ThemeColors) => {
  const isDark = mode === "dark";

  const shadowSoft = isDark
    ? {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.elevatedBorder,
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.12,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
      }
    : {
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      };

  return { shadowSoft };
};

export type ShadowStyles = ReturnType<typeof createShadowStyles>;

// Backwards compatibility for static imports. Prefer createShadowStyles + useTheme.
export const shadowSoft = createShadowStyles("light", LightColors).shadowSoft;
export const shadowSoftDark = createShadowStyles("dark", DarkColors).shadowSoft;
