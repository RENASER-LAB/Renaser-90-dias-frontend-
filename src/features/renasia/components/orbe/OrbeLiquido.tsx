import React, { useEffect, useMemo } from 'react';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../../../theme/ThemeContext';
import { coloresDelOrbe } from './coloresDelOrbe';
import { MS_ENTRADA, MS_SALIDA, ORBE_SKSL, VEL_IDLE, VEL_THINK } from './orbeShader';

/** Se compila una sola vez. `null` si el motor de Skia rechaza el shader: el orbe cae al simple. */
const EFECTO = Skia.RuntimeEffect.Make(ORBE_SKSL);

/** Existe el shader compilado: si no, `OrbeAcompanante` usa los halos animados. */
export const ORBE_LIQUIDO_DISPONIBLE = EFECTO !== null;

type Props = {
  /** 0 = reposo (flujo lento, dorado apagado) … 1 = pensando (flujo rápido, cinta abierta, brillo). */
  intensidad: number;
  diametro: number;
};

/**
 * La vuelta al reposo. El diseño usa smoothstep t²(3-2t); esta Bézier es prácticamente la misma
 * curva y es de Reanimated, así que ya corre en el hilo de UI. Una función propia con 'worklet'
 * dependía de que el plugin de Babel la transformara, y con la caché de Metro vieja reventaba Hoy:
 * "[Reanimated] The easing function is not a worklet" (2026-09-23).
 */
const SUAVE = Easing.bezier(0.45, 0, 0.55, 1);

/**
 * El orbe líquido de `docs/pendientes/ORBE_LIQUIDO_PENSANDO.md`, ahora sí en la app (pedido del
 * dueño, 2026-09-23): una cinta de partículas fluyendo dentro de un cristal, dibujada por un shader
 * de Skia en la GPU.
 *
 * - La intensidad pasa de un estado a otro con la transición del diseño (220 ms ease-out cúbico al
 *   subir, 650 ms smoothstep al bajar).
 * - La fase se ACUMULA con la velocidad del momento: la cinta acelera sin saltar de posición.
 * - Todo corre en el hilo de UI con Reanimated: React no se re-renderiza por cuadro.
 * - Con "reducir movimiento" la cinta queda quieta (se ve el orbe, no se mueve).
 */
export function OrbeLiquido({ intensidad, diametro }: Props) {
  const { mode } = useTheme();
  const reducido = useReducedMotion();
  const estado = useSharedValue(intensidad);
  const fase = useSharedValue(0);
  const colores = useMemo(() => coloresDelOrbe(mode === 'dark'), [mode]);

  useEffect(() => {
    const sube = intensidad > estado.value;
    estado.value = withTiming(intensidad, {
      duration: sube ? MS_ENTRADA : MS_SALIDA,
      easing: sube ? Easing.out(Easing.cubic) : SUAVE,
    });
  }, [intensidad, estado]);

  useFrameCallback(info => {
    if (reducido) return;
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    fase.value += dt * (VEL_IDLE + (VEL_THINK - VEL_IDLE) * estado.value);
  });

  const uniforms = useDerivedValue(() => ({
    uPix: [diametro, diametro],
    uFase: fase.value,
    uEstado: estado.value,
    uIdleA: colores.idleA,
    uIdleB: colores.idleB,
    uThinkA: colores.thinkA,
    uThinkB: colores.thinkB,
  }));

  if (!EFECTO) return null;
  return (
    <Canvas style={{ width: diametro, height: diametro }} pointerEvents="none">
      <Fill>
        <Shader source={EFECTO} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
