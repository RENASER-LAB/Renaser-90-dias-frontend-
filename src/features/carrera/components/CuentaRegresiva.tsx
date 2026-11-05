import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Presionable } from '../../../components/Presionable';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { decir, pitar } from '../servicios/vozDeLaCarrera';
import { TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';

/**
 * La cuenta regresiva 3, 2, 1 (FR-003): pantalla completa dorada, el número blanco dentro de un aro, y en cada número un pitido,
 * la voz y una vibración. Se ve una vez por carrera: cada número entra con un pequeño crecimiento (0,9 → 1, 220 ms, ease-out);
 * con «reducir movimiento», solo cambia el número.
 *
 * «Empezar ya» corta la cuenta y empieza; «Cancelar» descarta la carrera (todavía no se contó nada).
 */

const PALABRAS: Record<number, string> = { 3: 'tres', 2: 'dos', 1: 'uno' };

/** Opacidad del dorado cuando el mapa ya carga detrás: se adivina el mapa sin perder el contraste del número blanco. */
export const OPACIDAD_SOBRE_EL_MAPA = 0.86;

function conOpacidad(hex: string, opacidad: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacidad})`;
}

export function CuentaRegresiva({
  alTerminar,
  alCancelar,
  sobreElMapa = false,
}: {
  alTerminar: () => void;
  alCancelar: () => void;
  /** El mapa ya carga detrás (spec 042, 2026-11-05): el dorado deja verlo apenas. */
  sobreElMapa?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reducir = useReducedMotion();
  const [numero, setNumero] = useState(3);
  const terminado = useRef(false);
  const escala = useSharedValue(1);
  const opacidad = useSharedValue(1);

  const terminar = useRef<() => void>(() => undefined);
  terminar.current = () => {
    if (terminado.current) return;
    terminado.current = true;
    tacto.logro();
    decir(TEXTOS_DE_LA_CARRERA.aCorrer);
    alTerminar();
  };

  useEffect(() => {
    if (terminado.current) return;
    pitar();
    tacto.seleccion();
    decir(PALABRAS[numero] ?? '');
    if (!reducir) {
      escala.set(0.9);
      opacidad.set(0.4);
      escala.set(withTiming(1, { duration: 220, easing: CURVA_SALIDA }));
      opacidad.set(withTiming(1, { duration: 220, easing: CURVA_SALIDA }));
    }
    const id = setTimeout(() => {
      if (numero <= 1) terminar.current();
      else setNumero(n => n - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [numero, reducir, escala, opacidad]);

  const estiloNumero = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }], opacity: opacidad.get() }));

  return (
    <View style={[estilos.fondo, { backgroundColor: sobreElMapa ? conOpacidad(c.gold, OPACIDAD_SOBRE_EL_MAPA) : c.gold, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={estilos.centro} accessibilityLiveRegion="assertive" accessibilityLabel={`Empieza en ${numero}`}>
        <View style={estilos.aro}>
          <Animated.Text style={[estilos.numero, estiloNumero]}>{numero}</Animated.Text>
        </View>
      </View>
      <View style={estilos.botones}>
        <Presionable
          onPress={() => terminar.current()}
          accessibilityRole="button"
          accessibilityLabel={TEXTOS_DE_LA_CARRERA.empezarYa}
          style={estilos.empezar}
        >
          <Text style={[estilos.textoEmpezar, { color: c.goldInk }]}>{TEXTOS_DE_LA_CARRERA.empezarYa}</Text>
        </Presionable>
        <Presionable
          onPress={() => {
            terminado.current = true;
            alCancelar();
          }}
          accessibilityRole="button"
          accessibilityLabel={TEXTOS_DE_LA_CARRERA.cancelar}
          style={estilos.cancelar}
        >
          <Text style={estilos.textoCancelar}>{TEXTOS_DE_LA_CARRERA.cancelar}</Text>
        </Presionable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  aro: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { color: '#FFFFFF', fontFamily: fuentes.negrita, fontSize: 112, fontVariant: ['tabular-nums'], lineHeight: 130 },
  botones: { gap: 8 },
  empezar: { minHeight: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  textoEmpezar: { fontFamily: fuentes.negrita, fontSize: 17 },
  cancelar: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  textoCancelar: { color: '#FFFFFF', fontFamily: fuentes.seminegrita, fontSize: 16 },
});
