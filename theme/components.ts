import { StyleSheet } from "react-native";
import { LightColors, type ThemeColors } from "./colors";

export const createComponents = (colors: ThemeColors) => {
  const cardBase = {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  } as const;

  const compactCard = {
    ...cardBase,
    padding: 12,
    borderRadius: 12,
  } as const;

  const chipBase = {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  } as const;

  const sectionBlock = {
    marginTop: 4,
    gap: 6,
  } as const;

  return {
    cardBase,
    compactCard,
    chipBase,
    sectionBlock,
  };
};

export type ComponentMixins = ReturnType<typeof createComponents>;

// Backwards compatibility for static imports. Prefer createComponents + useTheme.
export const { cardBase, compactCard, chipBase, sectionBlock } =
  createComponents(LightColors);
