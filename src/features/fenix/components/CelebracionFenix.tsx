import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Presionable } from '../../../components/Presionable';
import { ALTO_TAB_BAR, SEPARACION } from '../../renasia/components/lugarDelLanzador';
import type { PhoenixMascotHandle } from '../rive/PhoenixMascot';
import type { PhoenixMood } from '../rive/phoenixMaster';
import type { HitoDelFenix } from '../utils/hitosDelFenix';
import { FenixVivo } from './FenixVivo';

/** Sin rig que avise el final (web, «reducir movimiento», `.riv` caído): el fénix queda a la vista este rato. */
export const QUIETO_MS = 1600;
export const TAMANO_CELEBRACION = 180;

const LO_QUE_SE_CELEBRA: Record<HitoDelFenix, string> = {
  todosLosHabitos: 'Cumpliste todos tus hábitos de hoy',
  racha7: 'Siete días seguidos',
  racha30: 'Treinta días seguidos',
};

/**
 * La celebración corta del fénix (entrega v3.3, §8.5): chiquita, abajo, sobre la barra de pestañas. No bloquea la
 * pantalla (la capa es `box-none`: solo el fénix recibe toques) y tocarlo la salta. Sin sonido. Al terminar, el fénix
 * se va y el de la tarjeta sigue en el ánimo del semáforo — la celebración no lo cambia.
 *
 * Entra con un fundido de 200 ms y sale con uno de 150 (Emil: la salida más corta que la entrada); el salto lo hace el
 * rig (`trgCelebrateShort`, ~1,9 s). Con «reducir movimiento», sin fundidos ni salto: el fénix quieto un momento.
 */
export function CelebracionFenix({ hito, animo, onTerminar }: { hito: HitoDelFenix; animo: PhoenixMood; onTerminar: () => void }) {
  const fenix = useRef<PhoenixMascotHandle>(null);
  const insets = useSafeAreaInsets();
  const reducido = useReducedMotion();
  const terminar = useRef(onTerminar);
  terminar.current = onTerminar;

  useEffect(() => {
    let vivo = true;
    const fin = () => {
      if (vivo) terminar.current();
    };
    AccessibilityInfo.announceForAccessibility?.(LO_QUE_SE_CELEBRA[hito]);
    const handle = fenix.current;
    const sinRig = reducido || !handle?.director();
    let espera: ReturnType<typeof setTimeout> | null = null;
    if (sinRig) espera = setTimeout(fin, QUIETO_MS);
    else void handle?.celebrateShort().then(fin);
    return () => {
      vivo = false;
      if (espera) clearTimeout(espera);
    };
  }, [hito, reducido]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="celebracion-fenix">
      <Animated.View
        entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
        style={[estilos.lugar, { bottom: insets.bottom + ALTO_TAB_BAR + SEPARACION }]}
      >
        <Presionable
          onPress={() => terminar.current()}
          accessibilityRole="button"
          accessibilityLabel={`${LO_QUE_SE_CELEBRA[hito]}. Tocar para cerrar`}
        >
          <FenixVivo ref={fenix} size={TAMANO_CELEBRACION} animo={animo} etiqueta="Fénix celebrando" />
        </Presionable>
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  lugar: { position: 'absolute', alignSelf: 'center' },
});
