import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
   height: number;
   colors?: string[];
   style?: StyleProp<ViewStyle>;
};

const DEFAULT_COLORS = [
   'rgba(107, 114, 128, 0.32)',
   'rgba(107, 114, 128, 0)',
];

export default function TopFade({ height, colors = DEFAULT_COLORS, style }: Props) {
   return (
      <LinearGradient
         colors={colors}
         start={{ x: 0, y: 0 }}
         end={{ x: 0, y: 1 }}
         style={[styles.base, { height }, style]}
         pointerEvents="none"
      />
   );
}

const styles = StyleSheet.create({
   base: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
   },
});
