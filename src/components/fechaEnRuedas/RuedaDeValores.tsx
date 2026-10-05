import React, { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../../theme/ThemeContext';
import { tacto } from '../../utils/tacto';

/**
 * Una rueda de valores, como las del selector de fecha del teléfono (2026-10-05).
 *
 * - **Cinco filas a la vista y la del medio es la elegida** (la franja suave que la marca la dibuja
 *   quien junta las ruedas, de lado a lado, como la del sistema). Las de arriba
 *   y abajo se apagan y se achican con la distancia al centro: eso es lo que la hace leerse como
 *   una rueda y no como una lista. Se calcula cuadro a cuadro en el hilo de la interfaz
 *   (`useAnimatedScrollHandler`), sin volver a dibujar React mientras gira.
 * - **Se engancha fila por fila** (`snapToInterval`; en la web, `scroll-snap`).
 * - **Un «tic» por fila que pasa por el centro**, como el selector del sistema. Desde el hilo de la
 *   interfaz se avisa sólo cuando cambia la fila, nunca por cuadro.
 * - **Avisa el valor cuando la rueda se queda quieta** (o 140 ms sin cambiar de fila: en la web la
 *   rueda del mouse no tiene «fin de inercia»). Así una vuelta larga no re-dibuja el formulario por
 *   cada año que pasa.
 * - **Tocar una fila la lleva al centro.**
 * - **Lector de pantalla**: la rueda es un control «ajustable» con su valor en palabras; deslizar
 *   arriba/abajo sube o baja una fila.
 *
 * No reemplaza a `features/habits/components/Rueda` (la de la hora de los hábitos): aquella sólo
 * muestra números de dos cifras y vive dentro de su feature. Juntarlas es posible, pero tocaría
 * pantallas de Training que no son parte de este cambio.
 */

export const ALTO_FILA_RUEDA = 40;
const FILAS_VISIBLES = 5;
export const ALTO_RUEDA = ALTO_FILA_RUEDA * FILAS_VISIBLES;
/** Dónde empieza la fila del centro: ahí dibuja la franja quien junta las ruedas. */
export const ARRIBA_FILA_CENTRAL = ALTO_FILA_RUEDA * Math.floor(FILAS_VISIBLES / 2);
const RELLENO = ARRIBA_FILA_CENTRAL;
const MS_QUIETO = 140;

export interface OpcionDeRueda {
  valor: number;
  texto: string;
}

interface RuedaDeValoresProps {
  /** Qué elige esta rueda («Día», «Mes», «Año»): lo anuncia el lector de pantalla. */
  etiqueta: string;
  opciones: readonly OpcionDeRueda[];
  valor: number;
  alCambiar: (valor: number) => void;
  /** Cuánto ancho ocupa al lado de las otras ruedas. */
  flex?: number;
}

function indiceDe(opciones: readonly OpcionDeRueda[], valor: number): number {
  const i = opciones.findIndex(o => o.valor === valor);
  return i < 0 ? 0 : i;
}

export function RuedaDeValores({ etiqueta, opciones, valor, alCambiar, flex = 1 }: RuedaDeValoresProps) {
  const lista = useAnimatedRef<Animated.ScrollView>();
  const indiceInicial = indiceDe(opciones, valor);
  const desplazamiento = useSharedValue(indiceInicial * ALTO_FILA_RUEDA);
  const filaEnElCentro = useSharedValue(indiceInicial);
  /** La fila que el formulario ya conoce (o que la rueda acaba de avisar). */
  const indiceAvisado = useRef(indiceInicial);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opciones$ = useRef(opciones);
  opciones$.current = opciones;
  const alCambiar$ = useRef(alCambiar);
  alCambiar$.current = alCambiar;

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  const avisar = (indice: number) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    const opcion = opciones$.current[indice];
    if (!opcion || indice === indiceAvisado.current) return;
    indiceAvisado.current = indice;
    alCambiar$.current(opcion.valor);
  };

  /** Pasó una fila por el centro: el «tic», y el aviso cuando se quede quieta. */
  const alPasarFila = (indice: number) => {
    tacto.seleccion();
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => avisar(indice), MS_QUIETO);
  };

  const total = opciones.length;
  const alDesplazar = useAnimatedScrollHandler({
    onScroll: e => {
      desplazamiento.set(e.contentOffset.y);
      const fila = Math.max(0, Math.min(total - 1, Math.round(e.contentOffset.y / ALTO_FILA_RUEDA)));
      if (fila !== filaEnElCentro.get()) {
        filaEnElCentro.set(fila);
        scheduleOnRN(alPasarFila, fila);
      }
    },
    onMomentumEnd: e => {
      const fila = Math.max(0, Math.min(total - 1, Math.round(e.contentOffset.y / ALTO_FILA_RUEDA)));
      scheduleOnRN(avisar, fila);
    },
  });

  const llevarA = (indice: number, animado: boolean) => {
    lista.current?.scrollTo({ y: indice * ALTO_FILA_RUEDA, animated: animado });
  };

  /* Si el valor cambia desde afuera (el día que se recorta al pasar a febrero), la rueda lo sigue.
     Si cambió porque la propia rueda lo avisó, ya está ahí y no se mueve. */
  useEffect(() => {
    const indice = indiceDe(opciones, valor);
    if (indice === indiceAvisado.current && indice === filaEnElCentro.get()) return;
    indiceAvisado.current = indice;
    filaEnElCentro.set(indice);
    llevarA(indice, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, opciones.length]);

  /* La posición inicial. `contentOffset` sólo lo respeta iOS (ver el comentario de `Rueda` en
     habits, el síntoma de la rueda en 00 con el botón diciendo 05:00): en Android hace falta ir. */
  useEffect(() => {
    llevarA(indiceInicial, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alAccionAccesible = (evento: AccessibilityActionEvent) => {
    const actual = indiceDe(opciones, valor);
    const destino = evento.nativeEvent.actionName === 'increment' ? actual + 1 : actual - 1;
    if (destino < 0 || destino >= opciones.length) return;
    indiceAvisado.current = destino;
    filaEnElCentro.set(destino);
    llevarA(destino, false);
    alCambiar(opciones[destino].valor);
  };

  const textoActual = opciones[indiceDe(opciones, valor)]?.texto ?? '';

  return (
    <View style={[styles.caja, { flex }]}>
      <Animated.ScrollView
        ref={lista}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={etiqueta}
        accessibilityValue={{ text: textoActual }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={alAccionAccesible}
        style={[styles.rueda, Platform.OS === 'web' ? (ENGANCHE_WEB as object) : null]}
        contentContainerStyle={{ paddingVertical: RELLENO }}
        contentOffset={{ x: 0, y: indiceInicial * ALTO_FILA_RUEDA }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ALTO_FILA_RUEDA}
        decelerationRate="fast"
        onScroll={alDesplazar}
        scrollEventThrottle={16}
      >
        {opciones.map((opcion, indice) => (
          <FilaDeRueda
            key={opcion.valor}
            indice={indice}
            texto={opcion.texto}
            desplazamiento={desplazamiento}
            alTocar={() => {
              // El «tic» lo dan las filas que pasan por el centro mientras la rueda va hacia allá.
              llevarA(indice, true);
              avisar(indice);
            }}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

/** En la web, la rueda del mouse no conoce `snapToInterval`: el enganche lo hace el CSS. */
const ENGANCHE_WEB = { scrollSnapType: 'y mandatory' };
const ALINEACION_WEB = { scrollSnapAlign: 'center' };

const FilaDeRueda = React.memo(function FilaDeRueda({
  indice,
  texto,
  desplazamiento,
  alTocar,
}: {
  indice: number;
  texto: string;
  desplazamiento: SharedValue<number>;
  alTocar: () => void;
}) {
  const { c, t } = useTheme();
  const estilo = useAnimatedStyle(() => {
    const distancia = Math.abs(desplazamiento.get() / ALTO_FILA_RUEDA - indice);
    return {
      opacity: interpolate(distancia, [0, 1, 2, 3], [1, 0.5, 0.25, 0.1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(distancia, [0, 1, 2], [1, 0.94, 0.88], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Pressable
      onPress={alTocar}
      accessible={false}
      style={[styles.fila, Platform.OS === 'web' ? (ALINEACION_WEB as object) : null]}
    >
      <Animated.Text numberOfLines={1} style={[t.body, styles.texto, { color: c.textStrong }, estilo]}>
        {texto}
      </Animated.Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  caja: {
    height: ALTO_RUEDA,
    justifyContent: 'center',
  },
  rueda: {
    height: ALTO_RUEDA,
  },
  fila: {
    height: ALTO_FILA_RUEDA,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  texto: {
    fontFamily: 'Jost_500Medium',
    fontSize: 19,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
});
