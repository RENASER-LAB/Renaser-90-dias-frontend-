import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import { DIAS_DEL_PROGRAMA, puntoDelMedidor } from '../hooks/useProgramaDia';

/** Lo que tarda el arco en llenarse desde el inicio hasta el día actual. */
export const DURACION_LLENADO_MS = 1400;

/**
 * Medidor de 90 días de la pantalla PLAN, con entrada animada (pedido del dueño, 2026-09-29:
 * «que no cargue todo brusco, que venga desde 0 y aumente hasta tu día»).
 *
 * Al montar, y cada vez que cambia el día, el arco se llena desde el inicio hasta el día actual,
 * el punto dorado lo recorre y el número del centro cuenta desde 0. Una sola vez: un re-render de
 * la pantalla no la repite, porque el efecto depende solo de `dia` y de la preferencia de
 * movimiento.
 *
 * **Por qué `Animated` con `useNativeDriver: false`.** Lo que cambia es el `d` de un `Path` de SVG
 * y el texto de un número: ninguno de los dos lo puede mover el driver nativo de `Animated`.
 * Reanimated podría, pero no está garantizado que el APK instalado lo traiga (no hay APK nuevo y
 * sin `expo-updates`), y este componente tiene que andar con el JS que llegue. El costo queda
 * acotado: el `setState` por cuadro vive **solo aquí**, que dibuja tres trazos y un número; la
 * pantalla PLAN no se vuelve a pintar.
 *
 * **Reducir movimiento** (sistema o `prefers-reduced-motion` en web, que react-native-web lee en
 * `isReduceMotionEnabled`): se muestra el estado final directo, sin llenado.
 *
 * **Lector de pantalla:** el bloque entero es un solo elemento con la etiqueta del valor final
 * («Día 23 de 90»); los números intermedios no se anuncian.
 */
export function ArcoDelDia({ dia, ancho, alto }: { dia: number; ancho: number; alto: number }) {
  const { c, t } = useTheme();
  const valorMostrado = useLlenadoAnimado(dia);
  const medidor = puntoDelMedidor(valorMostrado);
  const etiqueta = `Día ${dia} de ${DIAS_DEL_PROGRAMA}`;

  return (
    <View
      style={[styles.gauge, { height: alto + 8 }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={etiqueta}
      testID="arco-del-dia"
    >
      <Svg width={ancho} height={alto} viewBox="0 0 228 120">
        <Path d="M14 108a100 100 0 0 1 200 0" stroke={c.divider} strokeWidth={5} strokeLinecap="round" fill="none" />
        <Path d={medidor.path} stroke={c.chevron} strokeWidth={5} strokeLinecap="round" fill="none" />
        <Circle cx={medidor.x} cy={medidor.y} r={6} fill={c.gold} />
      </Svg>
      <View style={styles.gaugeCenter} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={[t.micro, { color: c.micro }]}>DÍA</Text>
        {/* `t.metric` y no un `fontFamily` suelto: trae las cifras tabulares que pide
            AGENTS.md §4 para todo número que cambia en pantalla. Con la cuenta animada importa
            todavía más: sin cifras tabulares el número bailaría de ancho en cada cuadro. */}
        <Text testID="arco-del-dia-numero" style={[t.metric, { fontSize: 40, lineHeight: 46, color: c.textStrong }]}>
          {Math.round(valorMostrado)}
        </Text>
        <Text style={[t.small, { color: c.micro }]}>DE {DIAS_DEL_PROGRAMA}</Text>
      </View>
      <Text style={[t.small, styles.gaugeLeft, { color: c.textSoft }]}>01</Text>
      <Text style={[t.small, styles.gaugeRight, { color: c.textSoft }]}>90</Text>
    </View>
  );
}

/**
 * Valor que se dibuja en cada cuadro: sube de 0 a `dia` con ease-out y termina **exactamente**
 * en `dia` (se fija al final, no se confía en el último cuadro del timing).
 */
function useLlenadoAnimado(dia: number): number {
  const movimientoReducido = useMovimientoReducido();
  const [valor, setValor] = useState(0);
  const progreso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Mientras no se sabe la preferencia, el arco espera vacío: evita pintar el final y
    // saltar a 0 para arrancar.
    if (movimientoReducido === null) return;
    if (movimientoReducido || dia <= 0) {
      setValor(Math.max(dia, 0));
      return;
    }
    progreso.setValue(0);
    setValor(0);
    const escucha = progreso.addListener(({ value }) => setValor(value));
    const animacion = Animated.timing(progreso, {
      toValue: dia,
      duration: DURACION_LLENADO_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animacion.start(({ finished }) => {
      if (finished) setValor(dia);
    });
    return () => {
      animacion.stop();
      progreso.removeListener(escucha);
    };
  }, [dia, movimientoReducido, progreso]);

  return valor;
}

function useMovimientoReducido(): boolean | null {
  const [reducido, setReducido] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => { if (vivo) setReducido(v); })
      .catch(() => { if (vivo) setReducido(false); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setReducido(v));
    return () => { vivo = false; sub.remove(); };
  }, []);
  return reducido;
}

const styles = StyleSheet.create({
  gauge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.gap,
    position: 'relative',
  },
  gaugeCenter: {
    position: 'absolute',
    bottom: 2,
    alignItems: 'center',
  },
  gaugeLeft: {
    position: 'absolute',
    bottom: 0,
    left: 8,
  },
  gaugeRight: {
    position: 'absolute',
    bottom: 0,
    right: 8,
  },
});
