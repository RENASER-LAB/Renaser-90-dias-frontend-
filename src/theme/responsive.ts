import { useWindowDimensions } from 'react-native';

const BASE_WIDTH = 375;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.25;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / BASE_WIDTH));
  const isSmall = width < 360;
  const isShort = height < 720;
  const isTablet = width >= 768;
  const rs = (size: number) => Math.round(size * scale);
  const horizontalPadding = isSmall ? 14 : isTablet ? 32 : 20;

  return {
    width,
    height,
    scale,
    isSmall,
    isShort,
    isTablet,
    rs,
    horizontalPadding,
  };
}
