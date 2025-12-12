import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
   height: number;
   colors?: LinearGradientProps['colors'];
   style?: StyleProp<ViewStyle>;
};

const DEFAULT_COLORS: NonNullable<LinearGradientProps['colors']> = [
   'rgba(107, 114, 128, 0.32)', // Gray-500 with opacity
   'rgba(107, 114, 128, 0)',    // Transparent
];

export default function TopFade({ height, colors = DEFAULT_COLORS, style }: Props) {
   return (
      // 1. The Wrapper View handles the Position (Absolute) via NativeWind
      <View 
         className="absolute top-0 left-0 right-0 z-10"
         style={[{ height }, style]}
         pointerEvents="none"
      >
         {/* 2. The Gradient simply fills the wrapper */}
         <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.5 }}
            style={{ flex: 1 }} 
         />
      </View>
   );
}