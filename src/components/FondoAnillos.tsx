import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';

/**
 * Los anillos concéntricos de Renaser, como FONDO de pantalla completa.
 *
 * **Por qué existe.** En `LoginScreen` los anillos vivían dentro del `ScrollView`, como un bloque
 * de cabecera de ~180 px de alto. Se veían bien, pero empujaban el formulario hacia abajo: para
 * llenar el correo y la contraseña había que arrastrar con el dedo. Moviéndolos al fondo se
 * recupera todo ese alto y la marca queda MÁS presente, no menos.
 *
 * **Por qué SVG y no una imagen ni un video.** Tres razones concretas, no de gusto:
 * 1. **Tema.** Los colores salen de `ring1/ring2/ring3`, que ya están definidos para claro y
 *    oscuro. Un PNG o un MP4 tiene el color quemado y en modo claro se vería un cuadro negro.
 * 2. **Peso.** Esto son unos pocos KB de código. Un video de fondo son decenas de MB en el
 *    bundle, y encima el repo no tiene ningún reproductor instalado.
 * 3. **Nitidez.** Es vectorial: se ve igual en un teléfono chico que en una tablet, sin pixelar.
 *
 * **Accesibilidad.** La animación se apaga sola si la persona tiene "reducir movimiento" activado
 * en el sistema. Es un fondo decorativo: `pointerEvents="none"` para que nunca robe un toque, y
 * `accessibilityElementsHidden` para que el lector de pantalla no lo anuncie.
 */

interface FondoAnillosProps {
  /**
   * Dónde queda el centro de los anillos, como fracción del alto de pantalla. Por defecto 0.32
   * (arriba del medio): así el punto de luz queda detrás de la cabecera y los anillos exteriores
   * abrazan el formulario en vez de cruzarlo por el medio.
   */
  centroY?: number;
  /** `false` deja los anillos quietos. Útil si alguna pantalla los quiere completamente estáticos. */
  animado?: boolean;
  /** Ícono del centro. `null` lo oculta — útil cuando la pantalla ya dibuja el suyo encima. */
  icono?: 'diamond' | 'spark' | null;
}

export function FondoAnillos({ centroY = 0.32, animado = true, icono = 'spark' }: FondoAnillosProps) {
  const { c } = useTheme();
  const { width, height } = Dimensions.get('window');

  // El anillo más grande desborda la pantalla a propósito: recortado por los bordes se lee como
  // una onda que sigue expandiéndose, en vez de un círculo encerrado en un cuadro.
  const radioMayor = Math.max(width, height * 0.55) * 0.62;
  const radios = [radioMayor, radioMayor * 0.79, radioMayor * 0.60, radioMayor * 0.42, radioMayor * 0.26];
  const colores = [c.ring1, c.ring1, c.ring2, c.ring2, c.ring3];

  const cx = width / 2;
  const cy = height * centroY;

  // Una sola animación para todo el grupo: un latido lento de opacidad. No se anima el radio
  // porque escalar un SVG en cada frame es mucho más caro que cambiar su opacidad, y a esta
  // sutileza no se le nota la diferencia.
  const latido = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let vivo = true;
    let bucle: Animated.CompositeAnimation | null = null;

    const arrancar = () => {
      bucle = Animated.loop(
        Animated.sequence([
          Animated.timing(latido, {
            toValue: 1,
            duration: 3800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(latido, {
            toValue: 0,
            duration: 3800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      bucle.start();
    };

    if (!animado) return;
    // Si el sistema pide menos movimiento, se respeta y queda estático.
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reducido => {
        if (vivo && !reducido) arrancar();
      })
      .catch(() => {
        // Si la consulta falla (algunas versiones de Android), se prefiere el fondo quieto:
        // equivocarse hacia "sin movimiento" nunca molesta a nadie.
      });

    return () => {
      vivo = false;
      bucle?.stop();
    };
  }, [animado, latido]);

  const opacidad = latido.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacidad }]}>
        <Svg width={width} height={height}>
          {/* La clave es el ÍNDICE y no el radio. Con `key={r}` los cinco anillos comparten
              clave en cuanto `radioMayor` vale 0 —el primer render, antes de que el contenedor
              tenga tamaño—, porque los cinco radios se derivan de él multiplicándolo: 0 × 0.79
              sigue siendo 0. React lo grita en cada montaje de la pantalla de acceso.

              Aquí el índice SÍ es la identidad correcta, al revés que en una lista de datos:
              estos anillos son decorativos, son siempre cinco y nunca se reordenan. Lo que
              distingue al tercero del cuarto es su posición, no su valor. */}
          {radios.map((r, i) => (
            <Circle key={i} cx={cx} cy={cy} r={r} stroke={colores[i]} strokeWidth={1} fill="none" />
          ))}
        </Svg>
      </Animated.View>

      {icono && (
        <View style={[styles.centro, { top: cy - 22, left: cx - 22, borderColor: c.borderStrong }]}>
          <Icon name={icono} size={20} color={c.goldInk} strokeWidth={1.2} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
