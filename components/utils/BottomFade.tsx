import EdgeFade from '@/components/utils/EdgeFade';
import { type StyleProp, type ViewStyle } from 'react-native';

type Props = {
   height: number;
   intensity?: number;
   style?: StyleProp<ViewStyle>;
};

export default function BottomFade({ height, intensity, style }: Props) {
   return (
      <EdgeFade
         height={height}
         intensity={intensity}
         style={style}
         position="bottom"
      />
   );
}
