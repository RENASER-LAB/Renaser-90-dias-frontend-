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
  /* Margenes por tramo segun AGENTS.md 2. El tramo 360-440 (donde caen la mayoria de
     Xiaomi y los Android estandar) pedia 18 y estaba recibiendo 20; 441-767 se queda en 20. */
  const horizontalPadding = isSmall ? 14 : isTablet ? 32 : width <= 440 ? 18 : 20;
  /* Ancho maximo de tarjeta en tablet, centrada (AGENTS.md 2). */
  const contentMaxWidth = isTablet ? 560 : undefined;

  return {
    width,
    height,
    scale,
    isSmall,
    isShort,
    isTablet,
    rs,
    horizontalPadding,
    contentMaxWidth,
  };
}
