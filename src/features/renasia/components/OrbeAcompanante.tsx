import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { FaseDeVoz } from '../hooks/useConversacionPorVoz';

type Props = {
  fase: FaseDeVoz;
  /** Diámetro del núcleo tocable. Los halos crecen alrededor, dentro de los anillos de Hoy. */
  diametro: number;
  onTocar: () => void;
  deshabilitado?: boolean;
};

/** Cuánto dura un latido de los halos en cada fase: rápido al escuchar, pausado al pensar. */
const LATIDO_MS: Record<FaseDeVoz, number> = {
  reposo: 3200,
  escuchando: 900,
  pensando: 1600,
  hablando: 650,
};

const ETIQUETA: Record<FaseDeVoz, string> = {
  reposo: 'Hablarle a tu acompañante',
  escuchando: 'Dejar de escuchar',
  pensando: 'Tu acompañante está pensando',
  hablando: 'Callar a tu acompañante',
};

/**
 * El orbe del acompañante en el centro de Hoy (pedido del dueño, 2026-09-23; reemplaza a "TU ÚNICO
 * FOCO / AHORA"). Un núcleo dorado tocable y dos halos que laten a un ritmo distinto según la fase,
 * para que se note sin leer nada si está escuchando, pensando o hablando.
 *
 * Se hace con `Animated` de React Native y no con un shader: el orbe líquido de
 * `docs/pendientes/ORBE_LIQUIDO_PENSANDO.md` necesita Skia o WebGL, que la app no tiene. Este es el
 * camino 4 de ese documento ("aproximación con las APIs que ya tiene el proyecto").
 *
 * Mismo cuidado que `ParticulaDeRitmo`: si el sistema pide reducir el movimiento, los halos quedan
 * quietos (la fase igual se dice con texto al lado).
 */
export function OrbeAcompanante({ fase, diametro, onTocar, deshabilitado }: Props) {
  const { c } = useTheme();
  const latido = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let vivo = true;
    let bucle: Animated.CompositeAnimation | null = null;
    latido.setValue(0);
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reducido => {
        if (!vivo || reducido) return;
        bucle = Animated.loop(
          Animated.timing(latido, {
            toValue: 1,
            duration: LATIDO_MS[fase],
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        );
        bucle.start();
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
      bucle?.stop();
    };
  }, [fase, latido]);

  const activo = fase !== 'reposo';
  const halo = (desfase: number) => {
    const t = Animated.modulo(Animated.add(latido, desfase), 1);
    return {
      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [activo ? 0.45 : 0.18, 0] }),
      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, activo ? 1.55 : 1.25] }) }],
    };
  };
  const respiro =
    fase === 'pensando'
      ? { transform: [{ scale: latido.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.96, 1.04, 0.96] }) }] }
      : null;
  const colorNucleo = fase === 'escuchando' ? c.danger : c.gold;

  return (
    <View style={[styles.contenedor, { width: diametro, height: diametro }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { width: diametro, height: diametro, borderRadius: diametro / 2, backgroundColor: colorNucleo }, halo(0)]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { width: diametro, height: diametro, borderRadius: diametro / 2, backgroundColor: colorNucleo }, halo(0.5)]}
      />
      <Animated.View style={respiro}>
        <Pressable
          onPress={onTocar}
          disabled={deshabilitado}
          accessibilityRole="button"
          accessibilityLabel={ETIQUETA[fase]}
          style={({ pressed }) => [
            styles.nucleo,
            {
              width: diametro,
              height: diametro,
              borderRadius: diametro / 2,
              backgroundColor: colorNucleo,
              opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Icon name={fase === 'hablando' ? 'volume' : 'mic'} size={Math.round(diametro * 0.34)} color={c.onGold} strokeWidth={1.4} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  nucleo: { alignItems: 'center', justifyContent: 'center' },
});
