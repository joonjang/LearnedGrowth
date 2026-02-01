import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import {
   NativeModules,
   Platform,
   UIManager,
   View,
   type StyleProp,
   type ViewStyle,
} from 'react-native';

type EdgeFadeProps = {
   height: number;
   intensity?: number;
   position?: 'top' | 'bottom';
   style?: StyleProp<ViewStyle>;
};

const DEFAULT_INTENSITY = 40;
const DEFAULT_ANDROID_REDUCTION = 2;

// Smoother, "Exponential" fade to avoid the "shelf" look
const MASK_COLORS = [
   'rgba(0, 0, 0, 1)',
   'rgba(0, 0, 0, 0.9)',
   'rgba(0, 0, 0, 0.5)',
   'rgba(0, 0, 0, 0)',
] as const;
const MASK_LOCATIONS = [0, 0.3, 0.7, 1] as const;

// Fallback logic for when MaskedView isn't available
const FALLBACK_BG_LIGHT = '#FFFFFF';
const FALLBACK_BG_DARK = '#000000';

export default function EdgeFade({
   height,
   intensity = DEFAULT_INTENSITY,
   position = 'top',
   style,
}: EdgeFadeProps) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const tint = isDark ? 'dark' : 'light';

   // Check availability
   const blurViewAvailable =
      (globalThis as any)?.expo?.modules?.ExpoBlurView ||
      NativeModules?.ExpoBlurView ||
      UIManager.getViewManagerConfig?.('ExpoBlurView');

   const maskedViewAvailable =
      !!UIManager.getViewManagerConfig?.('RNCMaskedView');

   // Android Props
   const androidBlurProps =
      Platform.OS === 'android'
         ? {
              experimentalBlurMethod: 'dimezisBlurView' as const,
              blurReductionFactor: DEFAULT_ANDROID_REDUCTION,
           }
         : {};

   if (height <= 0) return null;

   const isTop = position === 'top';

   // Gradient Coordinate Logic
   // Top: Start (0,0) -> End (0,1) | Colors: Opaque -> Transparent
   // Bottom: Start (0,1) -> End (0,0) | Colors: Opaque -> Transparent
   const gradientStart = isTop ? { x: 0, y: 0 } : { x: 0, y: 1 };
   const gradientEnd = isTop ? { x: 0, y: 1 } : { x: 0, y: 0 };

   const positionClass = isTop ? 'top-0' : 'bottom-0';

   // -- RENDER: FALLBACK (No Blur support) --
   if (!blurViewAvailable) {
      const fallbackColor = isDark ? FALLBACK_BG_DARK : FALLBACK_BG_LIGHT;
      return (
         <View
            className={`absolute ${positionClass} left-0 right-0 z-10`}
            style={[{ height }, style]}
            pointerEvents="none"
         >
            <LinearGradient
               colors={[fallbackColor, 'rgba(0,0,0,0)']}
               start={gradientStart}
               end={gradientEnd}
               style={{ flex: 1 }}
            />
         </View>
      );
   }

   // -- RENDER: MAIN (Masked Blur) --
   if (maskedViewAvailable) {
      return (
         <View
            className={`absolute ${positionClass} left-0 right-0 z-10`}
            style={[{ height }, style]}
            pointerEvents="none"
         >
            <MaskedView
               style={{ flex: 1 }}
               maskElement={
                  <LinearGradient
                     colors={MASK_COLORS}
                     locations={MASK_LOCATIONS}
                     start={gradientStart}
                     end={gradientEnd}
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
         </View>
      );
   }

   // -- RENDER: PARTIAL FALLBACK (Blur exists, but Mask doesn't) --
   // We overlay a gradient on top of the blur to hide the hard edge.
   // This transitions from Blur -> Solid Background Color (not ideal, but clean)
   const fallbackColor = isDark ? FALLBACK_BG_DARK : FALLBACK_BG_LIGHT;

   return (
      <View
         className={`absolute ${positionClass} left-0 right-0 z-10`}
         style={[{ height }, style]}
         pointerEvents="none"
      >
         <BlurView
            tint={tint}
            intensity={intensity}
            style={{ flex: 1 }}
            {...androidBlurProps}
         />
         {/* Overlay to hide hard edge */}
         <LinearGradient
            colors={['rgba(0,0,0,0)', fallbackColor]}
            locations={[0, 1]}
            start={gradientStart}
            end={gradientEnd}
            style={{ position: 'absolute', inset: 0 }}
         />
      </View>
   );
}
