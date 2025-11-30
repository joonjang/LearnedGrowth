import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';

type Props = {
   height: number;
   colors?: LinearGradientProps['colors'];
   style?: StyleProp<ViewStyle>;
};

const DEFAULT_COLORS: NonNullable<LinearGradientProps['colors']> = [
   'rgba(107, 114, 128, 0.32)',
   'rgba(107, 114, 128, 0)',
];

export default function TopFade({ height, colors = DEFAULT_COLORS, style }: Props) {
   return (
      <LinearGradient
         colors={colors}
         start={{ x: 0, y: 0 }}
         end={{ x: 0, y: 0.5 }}
         style={[styles.base, { height }, style]}
         pointerEvents="none"
      />
   );
}

const styles = StyleSheet.create({
   base: {
      ...StyleSheet.absoluteFillObject,
      bottom: undefined, // allow explicit height to control the fade depth
      zIndex: 1,
   },
});
