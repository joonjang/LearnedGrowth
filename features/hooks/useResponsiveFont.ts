import { useWindowDimensions, PixelRatio } from "react-native";

const GUIDELINE_BASE_WIDTH = 375;   // iPhone 11-ish
const clamp = (min: number, v: number, max: number) => Math.min(Math.max(v, min), max);

export function useResponsiveFont() {
  const { width } = useWindowDimensions();

  // moderated scale: don't overreact on tablets; factor in [0..1]
  const mscale = (size: number, factor = 0.35) => {
    const scaled = (width / GUIDELINE_BASE_WIDTH) * size;
    return size + (scaled - size) * factor;
  };

  /**
   * sfont(base, {min, max, factor})
   * - base: reference size on 375pt width
   * - min/max: absolute clamps (after moderation)
   * - factor: moderation strength (0 = no scale, 1 = full scale)
   */
  const scaleFont = (
    base: number,
    opts?: { min?: number; max?: number; factor?: number }
  ) => {
    const { min = base * 0.8, max = base * 1.5, factor = 0.35 } = opts || {};
    const raw = mscale(base, factor);
    return clamp(min, raw, max);
  };

  return { scaleFont, fontScale: PixelRatio.getFontScale() };
}