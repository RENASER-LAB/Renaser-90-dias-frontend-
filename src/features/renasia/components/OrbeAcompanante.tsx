import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { Icon } from "../../../components/Icon";
import { useTheme } from "../../../theme/ThemeContext";
import type { FaseDeVoz } from "../hooks/useConversacionPorVoz";
import { cargarOrbes } from "../utils/orbes";

const ORBES = cargarOrbes();

/**
 * Qué animación del paquete corresponde a cada fase (pedido del dueño, 2026-09-23):
 * reposo = tranquilo, escuchando = listening, pensando = solving, hablando = composing.
 */
const ANIMACION: Record<
  FaseDeVoz,
  "searching" | "listening" | "solving" | "composing"
> = {
  reposo: "searching",
  escuchando: "listening",
  pensando: "solving",
  hablando: "composing",
};

/** En reposo va lento: tiene que invitar a tocarlo, no parecer ocupado. */
const TEMPO: Record<FaseDeVoz, number> = {
  reposo: 0.35,
  escuchando: 1,
  pensando: 1,
  hablando: 0.9,
};

const ETIQUETA: Record<FaseDeVoz, string> = {
  reposo: "Hablarle a tu acompañante",
  escuchando: "Dejar de escuchar",
  pensando: "Tu acompañante está pensando",
  hablando: "Callar a tu acompañante",
};

/** Cuánto dura un latido de los halos del orbe simple en cada fase. */
const LATIDO_MS: Record<FaseDeVoz, number> = {
  reposo: 3200,
  escuchando: 900,
  pensando: 1600,
  hablando: 650,
};

type Props = {
  fase: FaseDeVoz;
  /** Diámetro del área del orbe (~140 en Hoy). */
  diametro: number;
  onTocar: () => void;
  deshabilitado?: boolean;
};

/**
 * El orbe del acompañante en el centro de Hoy (pedido del dueño, 2026-09-23; reemplaza a "TU ÚNICO
 * FOCO / AHORA"). Tocable: escucha, piensa y habla (`useConversacionPorVoz`).
 *
 * Es un orbe de razonamiento de `expo-thinking-orbs`: una nube de puntos en 3D que cambia de
 * animación según la fase, teñida con el dorado de la marca (`goldInk` → `gold`) sobre un halo
 * crema, sin fondo gris. Si el paquete no carga, queda el orbe simple de halos dorados.
 *
 * > Corregido 2026-09-23: la versión anterior dibujaba el orbe líquido del shader guardado en
 * > `docs/pendientes/`; al verlo en el teléfono el dueño lo reemplazó por este ("se ve feo").
 *
 * Reducir movimiento: el orbe se congela en su pose (y la fase se dice con texto debajo).
 */
export function OrbeAcompanante(props: Props) {
  const simple = <OrbeSimple {...props} diametro={Math.round(props.diametro * 0.62)} />;
  return ORBES ? (
    <SiFallaElOrbe alternativa={simple}>
      <OrbeDeRazonamiento {...props} />
    </SiFallaElOrbe>
  ) : (
    simple
  );
}

/**
 * Si el orbe animado revienta al dibujar (Skia en un teléfono que no lo soporta, como pasó en web
 * con E-255), queda el orbe simple en vez de Hoy entero en blanco. React solo atrapa errores de
 * render con un componente de clase.
 */
class SiFallaElOrbe extends React.Component<
  { alternativa: React.ReactNode; children: React.ReactNode },
  { fallo: boolean }
> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  render() {
    return this.state.fallo ? this.props.alternativa : this.props.children;
  }
}

function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (vivo) setReducido(valor);
      })
      .catch(() => undefined);
    const suscripcion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducido,
    );
    return () => {
      vivo = false;
      suscripcion.remove();
    };
  }, []);
  return reducido;
}

function OrbeDeRazonamiento({ fase, diametro, onTocar, deshabilitado }: Props) {
  const { c, mode } = useTheme();
  const reducido = useMovimientoReducido();
  const ThinkingOrb = ORBES!.ThinkingOrb;
  const oscuro = mode === "dark";

  return (
    <Pressable
      onPress={onTocar}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={ETIQUETA[fase]}
      style={({ pressed }) => [
        styles.contenedor,
        {
          width: diametro,
          height: diametro,
          opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Sin disco de fondo: los anillos de Hoy ya lo enmarcan, y un círculo relleno lo aplanaba
          (se veía como un plato beige con puntos). Solo un aro fino dorado mientras está activo. */}
      {fase !== "reposo" ? (
        <View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: diametro,
              height: diametro,
              borderRadius: diametro / 2,
              borderColor: c.gold,
            },
          ]}
        />
      ) : null}
      {/* El lienzo de Skia se queda con los toques: sin esto, tocar el orbe no llegaba al botón. */}
      <View pointerEvents="none">
        <ThinkingOrb
          state={ANIMACION[fase]}
          size={diametro}
          theme={oscuro ? "dark" : "light"}
          color={c.goldInk}
          colorTo={oscuro ? "#E5C689" : c.gold}
          speed={TEMPO[fase]}
          paused={reducido}
          dotScale={1.9}
        />
      </View>
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
      .then((reducido) => {
        if (!vivo || reducido) return;
        bucle = Animated.loop(
          Animated.timing(latido, {
            toValue: 1,
            duration: LATIDO_MS[fase],
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        );
        bucle.start();
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
      bucle?.stop();
    };
  }, [fase, latido]);

  const activo = fase !== "reposo";
  const halo = (desfase: number) => {
    const t = Animated.modulo(Animated.add(latido, desfase), 1);
    return {
      opacity: t.interpolate({
        inputRange: [0, 1],
        outputRange: [activo ? 0.45 : 0.18, 0],
      }),
      transform: [
        {
          scale: t.interpolate({
            inputRange: [0, 1],
            outputRange: [1, activo ? 1.55 : 1.25],
          }),
        },
      ],
    };
  };

  return (
    <View style={[styles.contenedor, { width: diametro, height: diametro }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: diametro,
            height: diametro,
            borderRadius: diametro / 2,
            backgroundColor: c.gold,
          },
          halo(0),
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: diametro,
            height: diametro,
            borderRadius: diametro / 2,
            backgroundColor: c.gold,
          },
          halo(0.5),
        ]}
      />
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
            backgroundColor: c.gold,
            opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Icon
          name={fase === "hablando" ? "volume" : "mic"}
          size={Math.round(diametro * 0.34)}
          color={c.onGold}
          strokeWidth={1.4}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", borderWidth: 1 },
  nucleo: { alignItems: "center", justifyContent: "center" },
});
