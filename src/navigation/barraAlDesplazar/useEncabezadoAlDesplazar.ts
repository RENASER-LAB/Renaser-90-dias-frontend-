import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DURACION_MS, useBarraInferior } from './BarraInferior';
import { desplazamientoDelEncabezado, siguienteEstadoDelEncabezado, type EstadoDelEncabezado } from './logicaDelEncabezado';

/** Lo que queda a la vista sobre la fila de círculos en el estado `circulos`. */
const AIRE_SOBRE_LA_FILA = 6;

/**
 * El encabezado de una pantalla (hoy, Comunidad) que se esconde y vuelve con la barra de
 * pestañas (2026-10-02; la decisión está en `logicaDelEncabezado.ts`).
 *
 * **Cómo se mueve sin hacer saltar la lista.** El encabezado deja de ocupar lugar en el flujo: va
 * ENCIMA de la lista (`flotante`) y cada lista suma su alto como relleno de arriba (`relleno`).
 * Esconderlo es solo un `transform` en el hilo de UI: ninguna lista cambia de alto, así que no hay
 * nada que recortar al final ni un cambio de alto que se pueda confundir con un desplazamiento (el
 * bucle que resolvió la barra, D-246). Arriba de todo el relleno deja el contenido justo debajo del
 * encabezado completo, como antes; más abajo, lo que pasa por debajo es contenido ya leído.
 *
 * Hasta medirse, y siempre que la barra esté fija («Reducir movimiento», lector de pantalla) o la
 * pantalla diga que no hay lista (`disponible: false`, la conversación abierta), el encabezado va
 * en el flujo como siempre: `flotante` es `false`, `relleno` 0 y nada se mueve.
 *
 * El estado lo toma de la barra (`suscribir`) y de la `y` de la lista (`alDesplazar`, que se pasa
 * como `onScroll` a `useOcultarBarraAlDesplazar`). Cada `mostrar()` de la barra —cambio de
 * pestaña, de sección, volver a la app— lo deja completo.
 */
export function useEncabezadoAlDesplazar(opciones: { disponible: boolean; conFila: boolean }) {
  const barra = useBarraInferior();
  const [altoTotal, setAltoTotal] = useState<number | null>(null);
  const [yDelBloque, setYDelBloque] = useState<number | null>(null);
  const [yDeLaFila, setYDeLaFila] = useState<number | null>(null);
  const flotante = !!barra && !barra.fija && opciones.disponible && altoTotal !== null;

  const sobreLaFila =
    opciones.conFila && yDelBloque !== null && yDeLaFila !== null
      ? Math.max(0, yDelBloque + yDeLaFila - AIRE_SOBRE_LA_FILA)
      : null;
  const altos = useRef({ total: 0, sobreLaFila: null as number | null });
  altos.current = { total: altoTotal ?? 0, sobreLaFila };

  const estado = useRef<EstadoDelEncabezado>('completo');
  const y = useRef(0);
  const reiniciosVistos = useRef(barra?.reinicios() ?? 0);
  const desplazamiento = useSharedValue(0);

  const llevarA = useCallback(
    (siguiente: EstadoDelEncabezado, animar: boolean) => {
      estado.current = siguiente;
      const destino = desplazamientoDelEncabezado(siguiente, altos.current);
      desplazamiento.value = animar ? withTiming(destino, { duration: DURACION_MS }) : destino;
    },
    [desplazamiento]
  );

  const decidir = useCallback(() => {
    if (!barra) return;
    let siguiente: EstadoDelEncabezado;
    if (barra.fija) {
      siguiente = 'completo';
    } else if (reiniciosVistos.current !== barra.reinicios()) {
      reiniciosVistos.current = barra.reinicios();
      siguiente = 'completo';
    } else {
      siguiente = siguienteEstadoDelEncabezado(estado.current, { y: y.current, barraVisible: !barra.estaEscondida() });
    }
    if (siguiente !== estado.current) llevarA(siguiente, true);
  }, [barra, llevarA]);

  useEffect(() => barra?.suscribir(decidir), [barra, decidir]);

  // Si cambia una medida (o deja de flotar), el desplazamiento del estado actual se corrige de una.
  useEffect(() => {
    llevarA(flotante ? estado.current : 'completo', false);
  }, [flotante, altoTotal, sobreLaFila, llevarA]);

  const alDesplazar = useCallback(
    (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
      y.current = Math.max(0, evento.nativeEvent.contentOffset.y);
      decidir();
    },
    [decidir]
  );

  const estiloAnimado = useAnimatedStyle(() => ({ transform: [{ translateY: desplazamiento.value }] }));

  const medir = useMemo(
    () => ({
      encabezado: (e: LayoutChangeEvent) => setAltoTotal(Math.round(e.nativeEvent.layout.height)),
      bloqueDeSecciones: (e: LayoutChangeEvent) => setYDelBloque(Math.round(e.nativeEvent.layout.y)),
      fila: (e: LayoutChangeEvent) => setYDeLaFila(Math.round(e.nativeEvent.layout.y)),
    }),
    []
  );

  return {
    flotante,
    /** Relleno de arriba para el contenido de cada lista (0 si el encabezado va en el flujo). */
    relleno: flotante ? (altoTotal ?? 0) : 0,
    alDesplazar,
    estiloAnimado,
    /** Cuánto subió el encabezado (0 completo, −alto oculto). Lo lee `estiloAnimado`; queda a mano para las pruebas. */
    desplazamiento,
    medir,
  };
}
