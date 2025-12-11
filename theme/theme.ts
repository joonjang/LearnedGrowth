import { useMemo } from "react";
import { usePreferences } from "@/providers/PreferencesProvider";
import {
  DarkColors,
  LightColors,
  getThemeColors,
  type ThemeColors,
  type ThemeMode,
} from "./colors";
import {
  createComponents,
  type ComponentMixins,
} from "./components";
import { createShadowStyles, type ShadowStyles } from "./shadows";
import { createTypography, type Typography } from "./typography";

export type Theme = {
  mode: ThemeMode;
  colors: ThemeColors;
  typography: Typography;
  components: ComponentMixins;
  shadows: ShadowStyles;
};

export function useTheme(): Theme {
  const { theme } = usePreferences();
  const colors = useMemo(() => getThemeColors(theme), [theme]);
  const typography = useMemo(() => createTypography(colors), [colors]);
  const components = useMemo(() => createComponents(colors), [colors]);
  const shadows = useMemo(
    () => createShadowStyles(theme, colors),
    [theme, colors]
  );

  return useMemo(
    () => ({
      mode: theme,
      colors,
      typography,
      components,
      shadows,
    }),
    [components, colors, shadows, theme, typography]
  );
}

export function makeThemedStyles<T>(factory: (theme: Theme) => T) {
  return () => {
    const theme = useTheme();
    return useMemo(() => factory(theme), [theme, factory]);
  };
}

export const lightTheme: Theme = {
  mode: "light",
  colors: LightColors,
  typography: createTypography(LightColors),
  components: createComponents(LightColors),
  shadows: createShadowStyles("light", LightColors),
};

export const darkTheme: Theme = {
  mode: "dark",
  colors: DarkColors,
  typography: createTypography(DarkColors),
  components: createComponents(DarkColors),
  shadows: createShadowStyles("dark", DarkColors),
};
