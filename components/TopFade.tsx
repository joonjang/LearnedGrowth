import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { Platform, UIManager, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
   height: number;
   intensity?: number;
   style?: StyleProp<ViewStyle>;
};

// Tune blur strength here (higher = stronger).
const DEFAULT_INTENSITY = 40;
// Android blur radius must be <= 25; this is the base reduction before clamping.
const DEFAULT_ANDROID_REDUCTION = 2;
const MAX_ANDROID_RADIUS = 25;
const FALLBACK_BG_LIGHT = '#f8fafc';
const FALLBACK_BG_DARK = '#0f172a';
const FALLBACK_GRADIENT_LIGHT = [
   'rgba(248, 250, 252, 0.9)',
   'rgba(248, 250, 252, 0.4)',
   'rgba(248, 250, 252, 0)',
] as const;
const FALLBACK_GRADIENT_DARK = [
   'rgba(15, 23, 42, 0.9)',
   'rgba(15, 23, 42, 0.45)',
   'rgba(15, 23, 42, 0)',
] as const;
const FALLBACK_GRADIENT_LOCATIONS = [0, 0.6, 1] as const;
// Mask ramp (top = full blur, bottom = no blur).
// Adjust colors/locations to control how quickly the blur fades.
const MASK_COLORS = [
   'rgba(0, 0, 0, 1)',
   'rgba(0, 0, 0, 0.65)',
   'rgba(0, 0, 0, 0)',
] as const;
const MASK_LOCATIONS = [0.5, 0.8, 1] as const;

export default function TopFade({ height, intensity = DEFAULT_INTENSITY, style }: Props) {
   const { colorScheme } = useColorScheme();
   const tint = colorScheme === 'dark' ? 'dark' : 'light';
   const blurViewAvailable = !!UIManager.getViewManagerConfig?.('ExpoBlurView');
   const maskedViewAvailable = !!UIManager.getViewManagerConfig?.('RNCMaskedView');
   const fallbackBg = tint === 'dark' ? FALLBACK_BG_DARK : FALLBACK_BG_LIGHT;
   const fallbackGradientColors =
      tint === 'dark' ? FALLBACK_GRADIENT_DARK : FALLBACK_GRADIENT_LIGHT;
   const androidBlurReduction =
      Platform.OS === 'android'
         ? Math.max(DEFAULT_ANDROID_REDUCTION, intensity / MAX_ANDROID_RADIUS)
         : DEFAULT_ANDROID_REDUCTION;
   const androidBlurProps =
      Platform.OS === 'android'
         ? {
              experimentalBlurMethod: 'dimezisBlurView' as const,
              // Keep radius within the Android limit while preserving strong blur.
              blurReductionFactor: androidBlurReduction,
           }
         : {};

   if (height <= 0) {
      return null;
   }

   return (
      // 1. The Wrapper View handles the Position (Absolute) via NativeWind
      <View 
         className="absolute top-0 left-0 right-0 z-10"
         style={[{ height }, style]}
         pointerEvents="none"
      >
         {!blurViewAvailable ? (
            <LinearGradient
               colors={fallbackGradientColors}
               locations={FALLBACK_GRADIENT_LOCATIONS}
               start={{ x: 0, y: 0 }}
               end={{ x: 0, y: 1 }}
               style={{ flex: 1 }}
            />
         ) : maskedViewAvailable ? (
            <MaskedView
               style={{ flex: 1 }}
               maskElement={
                  <LinearGradient
                     colors={MASK_COLORS}
                     locations={MASK_LOCATIONS}
                     start={{ x: 0, y: 0 }}
                     end={{ x: 0, y: 1 }}
                     style={{ flex: 1 }}
                  />
               }
            >
               <BlurView
                  tint={tint}
                  intensity={intensity}
                  style={{ flex: 1 }}
                  {...androidBlurProps}
               />
            </MaskedView>
         ) : (
            <>
               <BlurView
                  tint={tint}
                  intensity={intensity}
                  style={{ flex: 1 }}
                  {...androidBlurProps}
               />
               <LinearGradient
                  colors={['rgba(0, 0, 0, 0)', fallbackBg]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                     position: 'absolute',
                     top: 0,
                     left: 0,
                     right: 0,
                     bottom: 0,
                  }}
               />
            </>
         )}
      </View>
   );
}
