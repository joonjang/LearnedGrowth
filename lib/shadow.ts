import { Platform, StyleSheet, type ViewStyle } from 'react-native';

const BASE_IOS_SHADOW_PRESETS = {
   sm: { opacity: 0.08, radius: 4, offset: { width: 0, height: 2 } },
   md: { opacity: 0.1, radius: 8, offset: { width: 0, height: 4 } },
   lg: { opacity: 0.11, radius: 12, offset: { width: 0, height: 6 } },
   xl: { opacity: 0.12, radius: 16, offset: { width: 0, height: 10 } },
   '2xl': { opacity: 0.13, radius: 22, offset: { width: 0, height: 14 } },
} as const;

const BUTTON_IOS_SHADOW_PRESET = {
   opacity: 0.12,
   radius: 2,
   offset: { width: 0, height: 3 },
} as const;

const IOS_SHADOW_OPACITY_MULTIPLIER = 1.8;
const IOS_SHADOW_MAX_OPACITY = 0.22;
const IOS_BUTTON_OPACITY_MULTIPLIER = 2.1;
const IOS_BUTTON_MAX_OPACITY = 0.26;

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
   button: BUTTON_IOS_SHADOW_PRESET,
};

type GetIosShadowStyleOptions = {
   isDark: boolean;
   preset?: IosShadowPreset;
   colorLight?: string;
   disableInDark?: boolean;
};

type IosShadowStyle = Pick<
   ViewStyle,
   'shadowColor' | 'shadowOpacity' | 'shadowRadius' | 'shadowOffset'
>;

const ANDROID_SHADOW_CLASSES: Record<IosShadowPreset, string> = {
   sm: 'shadow-sm shadow-slate-300 dark:shadow-none',
   md: 'shadow-md shadow-slate-300 dark:shadow-none',
   lg: 'shadow-lg shadow-slate-300 dark:shadow-none',
   xl: 'shadow-xl shadow-slate-300 dark:shadow-none',
   '2xl': 'shadow-2xl shadow-slate-300 dark:shadow-none',
   card: 'shadow-md shadow-slate-300 dark:shadow-none',
   button: 'shadow-md shadow-slate-300 dark:shadow-none',
};

const ANDROID_ELEVATION: Record<IosShadowPreset, number> = {
   sm: 2,
   md: 4,
   lg: 6,
   xl: 8,
   '2xl': 10,
   card: 4,
   button: 3,
};

export function getIosShadowStyle({
   isDark,
   preset = 'card',
   colorLight = '#0f172a',
   disableInDark = true,
}: GetIosShadowStyleOptions): IosShadowStyle | undefined {
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
   const opacityMultiplier =
      preset === 'button' ? IOS_BUTTON_OPACITY_MULTIPLIER : IOS_SHADOW_OPACITY_MULTIPLIER;
   const maxOpacity =
      preset === 'button' ? IOS_BUTTON_MAX_OPACITY : IOS_SHADOW_MAX_OPACITY;
   return {
      shadowColor: colorLight,
      shadowOpacity: Math.min(
         selected.opacity * opacityMultiplier,
         maxOpacity
      ),
      shadowRadius: selected.radius,
      shadowOffset: selected.offset,
   };
}

type GetShadowOptions = GetIosShadowStyleOptions & {
   androidClassName?: string;
   androidElevation?: number;
   androidBorderColor?: string;
   androidBorderWidth?: number;
};

/**
 * Platform-aware shadow helper:
 * - Returns iOS shadow style
 * - Returns Android elevation + className fallback (shadow-* classes for tinting)
 */
export function getShadow({ androidClassName, ...opts }: GetShadowOptions) {
   const iosStyle = getIosShadowStyle(opts);
   const baseClass = androidClassName ?? ANDROID_SHADOW_CLASSES[opts.preset ?? 'card'] ?? '';
   const elevation =
      opts.androidElevation ?? ANDROID_ELEVATION[opts.preset ?? 'card'] ?? 0;
   const androidBorder =
      Platform.OS === 'android' && opts.androidBorderColor
         ? {
              borderColor: opts.androidBorderColor,
              borderWidth: opts.androidBorderWidth ?? StyleSheet.hairlineWidth,
           }
         : undefined;

   // Logic: Calculate specific Android props
   const androidStyle =
      Platform.OS === 'android'
         ? opts.disableInDark && opts.isDark
            ? { elevation: 0 }
            : {
                 elevation,
                 shadowColor: opts.colorLight ?? '#0f172a',
                 ...(androidBorder ?? {}),
              }
         : undefined;

   // Logic: Determine class name
   const className =
      opts.disableInDark && opts.isDark ? 'shadow-none' : baseClass;

   return {
      // 👇 MERGED: Just pass this to style={}
      style: [iosStyle, androidStyle], 
      
      // Keep explicit separates in case you need them for edge cases
      ios: iosStyle,
      android: androidStyle,
      className,
   };
}
