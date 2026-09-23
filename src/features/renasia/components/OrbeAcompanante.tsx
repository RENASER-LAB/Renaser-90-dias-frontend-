import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { FaseDeVoz } from '../hooks/useConversacionPorVoz';

/**
 * El orbe líquido (Skia + Reanimated) se carga opcional: son módulos nativos, y si el binario
 * instalado no los trae, Hoy tiene que abrir igual con los halos simples. Mismo criterio que la voz
 * en `useDictado` ("Cannot find native module", 2026-09-23).
 */
function cargarOrbeLiquido(): typeof import('./orbe/OrbeLiquido') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const modulo = require('./orbe/OrbeLiquido') as typeof import('./orbe/OrbeLiquido');
    return modulo.ORBE_LIQUIDO_DISPONIBLE ? modulo : null;
  } catch {
    return null;
  }
}

const LIQUIDO = cargarOrbeLiquido();

/** Qué tan "encendido" se ve el orbe líquido en cada fase (0 reposo … 1 pensando). */
const INTENSIDAD: Record<FaseDeVoz, number> = {
  reposo: 0,
  escuchando: 0.7,
  pensando: 1,
  hablando: 0.55,
};

type Props = {
  fase: FaseDeVoz;
  /** Diámetro del área del orbe. El líquido la ocupa entera; el simple usa un núcleo más chico. */
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
 * FOCO / AHORA"). Tocable: escucha, piensa y habla (`useConversacionPorVoz`).
 *
 * Por defecto es el **orbe líquido** (`orbe/OrbeLiquido`, shader de Skia): la cinta fluye lenta en
 * reposo y se abre y acelera al pensar. Si Skia no está en el binario o el shader no compila, cae al
 * **orbe simple**: un núcleo dorado con dos halos de `Animated` que laten a otro ritmo por fase.
 *
 * > Corregido 2026-09-23: la primera versión de este comentario decía que el orbe líquido no se
 * > podía hacer porque la app no tenía Skia. Se instaló Skia ese mismo día.
 *
 * En los dos, si el sistema pide reducir el movimiento, la animación queda quieta (la fase igual se
 * dice con texto debajo del orbe).
 */
export function OrbeAcompanante({ fase, diametro, onTocar, deshabilitado }: Props) {
  if (LIQUIDO) {
    return <OrbeConLiquido fase={fase} diametro={diametro} onTocar={onTocar} deshabilitado={deshabilitado} />;
  }
  return <OrbeSimple fase={fase} diametro={Math.round(diametro * 0.62)} onTocar={onTocar} deshabilitado={deshabilitado} />;
}

/**
 * El orbe líquido tocable. Al escuchar se le suma un aro que late en rojo: es la señal, universal
 * en las apps de voz, de que el micrófono está abierto.
 */
function OrbeConLiquido({ fase, diametro, onTocar, deshabilitado }: Props) {
  const { c } = useTheme();
  const Liquido = LIQUIDO!.OrbeLiquido;
  return (
    <Pressable
      onPress={onTocar}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={ETIQUETA[fase]}
      style={({ pressed }) => [styles.contenedor, { width: diametro, height: diametro, opacity: deshabilitado ? 0.5 : pressed ? 0.9 : 1 }]}
    >
      {fase === 'escuchando' ? (
        <View
          pointerEvents="none"
          style={[styles.halo, styles.aroEscuchando, { width: diametro, height: diametro, borderRadius: diametro / 2, borderColor: c.danger }]}
        />
      ) : null}
      <Liquido intensidad={INTENSIDAD[fase]} diametro={diametro} />
    </Pressable>
  );
}

function OrbeSimple({ fase, diametro, onTocar, deshabilitado }: Props) {
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
  aroEscuchando: { borderWidth: 2 },
  nucleo: { alignItems: 'center', justifyContent: 'center' },
});
