import { LightColors, type ThemeColors } from "./colors";

export const createTypography = (colors: ThemeColors) =>
  ({
    title: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSubtle,
    },
    body: {
      fontSize: 14,
      color: colors.text,
    },
    caption: {
      fontSize: 12,
      color: colors.hint,
    },
    chip: {
      fontSize: 11,
      fontWeight: "600" as const,
    },
  }) as const;

export type Typography = ReturnType<typeof createTypography>;

// Backwards compatibility for static imports. Prefer createTypography + useTheme.
export const typography = createTypography(LightColors);
