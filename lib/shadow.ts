import { Platform, type ViewStyle } from 'react-native';

const BASE_IOS_SHADOW_PRESETS = {
   sm: { opacity: 0.08, radius: 4, offset: { width: 0, height: 2 } },
   md: { opacity: 0.1, radius: 8, offset: { width: 0, height: 4 } },
   lg: { opacity: 0.11, radius: 12, offset: { width: 0, height: 6 } },
   xl: { opacity: 0.12, radius: 16, offset: { width: 0, height: 10 } },
   '2xl': { opacity: 0.13, radius: 22, offset: { width: 0, height: 14 } },
} as const;

export type IosShadowPreset =
   | keyof typeof BASE_IOS_SHADOW_PRESETS
   | 'card'
   | 'button';

const IOS_SHADOW_PRESETS: Record<
   IosShadowPreset,
   { opacity: number; radius: number; offset: { width: number; height: number } }
> = {
   ...BASE_IOS_SHADOW_PRESETS,
   card: BASE_IOS_SHADOW_PRESETS.md,
   button: BASE_IOS_SHADOW_PRESETS.sm,
};

type GetIosShadowStyleOptions = {
   isDark: boolean;
   preset?: IosShadowPreset;
   colorLight?: string;
   disableInDark?: boolean;
};

export function getIosShadowStyle({
   isDark,
   preset = 'card',
   colorLight = '#0f172a',
   disableInDark = true,
}: GetIosShadowStyleOptions): ViewStyle | undefined {
   if (Platform.OS !== 'ios') return undefined;

   if (disableInDark && isDark) {
      return {
         shadowColor: 'transparent',
         shadowOpacity: 0,
         shadowRadius: 0,
         shadowOffset: { width: 0, height: 0 },
      };
   }

   const selected = IOS_SHADOW_PRESETS[preset];
   return {
      shadowColor: colorLight,
      shadowOpacity: selected.opacity,
      shadowRadius: selected.radius,
      shadowOffset: selected.offset,
   };
}
