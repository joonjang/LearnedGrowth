import { StyleSheet } from "react-native";
import { palette } from "./colors";

export const cardBase = {
  padding: 16,
  borderRadius: 16,
  backgroundColor: palette.cardBg,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: palette.border,
} as const;

export const compactCard = {
  ...cardBase,
  padding: 12,
  borderRadius: 12,
} as const;

export const chipBase = {
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 999,
} as const;

export const sectionBlock = {
  marginTop: 4,
  gap: 6,
} as const;
