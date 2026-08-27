import { useWindowDimensions } from 'react-native';

const BASE_WIDTH = 375;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.25;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / BASE_WIDTH));
  const isSmall = width < 360;
  const isTablet = width >= 768;
  const rs = (size: number) => Math.round(size * scale);
  return { width, height, scale, isSmall, isTablet, rs };
}
