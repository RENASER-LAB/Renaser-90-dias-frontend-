import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Keyboard,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ReduceMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { ESTADO_INICIAL, siguienteEstadoDeLaBarra, type EstadoDeLaBarra } from './logicaDeLaBarra';

/**
 * Estado compartido de la barra de pestañas para «ocultarla al desplazar» (2026-10-02).
 *
 * - `escondida` va de 0 (a la vista) a 1 (escondida) y la anima Reanimated en el hilo de UI. La
 *   leen `TabBar` (que desliza la barra hacia abajo) y el botón flotante del acompañante (que la
 *   acompaña, para no quedar colgado a media pantalla). Solo mueve con `transform`.
 * - `estaEscondida`/`suscribir`: el mismo estado, pero de una vez y en JS, para el ÚNICO cambio de
 *   alto (la caja de la barra pasa de su alto al borde seguro). Va aparte del contexto para que
 *   cambiarlo vuelva a dibujar solo la barra y no cada pantalla que usa el hook.
 * - `altoQueGana` lo mide `TabBar`: cuánto crece la pantalla con la barra escondida.
 *
 * **Se queda fija a la vista** con un lector de pantalla activo. Por pedido del dueño (2026-10-03),
 * desactivar las animaciones del sistema ya no bloquea este gesto: la barra y el encabezado de
 * Comunidad conservan su transición de 200 ms.
 */
export interface BarraInferior {
  escondida: SharedValue<number>;
  altoQueGana: SharedValue<number>;
  /** Pide el estado que decidió una lista. No hace nada si la barra está fija. */
  fijarVisible: (visible: boolean) => void;
  /** La devuelve a la vista y hace que cada lista empiece a medir de nuevo. */
  mostrar: () => void;
  /** Cuántas veces se forzó `mostrar`: una lista que ve otro número reinicia su medida. */
  reinicios: () => number;
  estaEscondida: () => boolean;
  suscribir: (aviso: () => void) => () => void;
  fija: boolean;
}

export const DURACION_MS = 200;

const Contexto = createContext<BarraInferior | null>(null);

function useLectorDePantalla() {
  const [activo, setActivo] = useState(false);
  useEffect(() => {
    // En la web no hay forma de saber si hay un lector de pantalla, y `react-native-web` responde
    // SIEMPRE que sí: la barra (y el encabezado de Comunidad) quedaban fijos para todo el mundo en
    // la web (E-499, 2026-10-02).
    if (Platform.OS === 'web') return;
    let vivo = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then(v => vivo && setActivo(!!v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', v => setActivo(!!v));
    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, []);
  return activo;
}

export function BarraInferiorProvider({ children }: { children: React.ReactNode }) {
  const escondida = useSharedValue(0);
  const altoQueGana = useSharedValue(0);
  const visibleRef = useRef(true);
  const reiniciosRef = useRef(0);
  const avisos = useRef(new Set<() => void>()).current;
  const fija = useLectorDePantalla();
  const fijaRef = useRef(fija);
  fijaRef.current = fija;

  const fijarVisible = useCallback(
    (visible: boolean) => {
      const destino = visible || fijaRef.current;
      if (visibleRef.current === destino) return;
      visibleRef.current = destino;
      escondida.value = withTiming(destino ? 0 : 1, { duration: DURACION_MS, reduceMotion: ReduceMotion.Never });
      avisos.forEach(aviso => aviso());
    },
    [escondida, avisos]
  );
  const suscribir = useCallback(
    (aviso: () => void) => {
      avisos.add(aviso);
      return () => {
        avisos.delete(aviso);
      };
    },
    [avisos]
  );

  const mostrar = useCallback(() => {
    reiniciosRef.current += 1;
    fijarVisible(true);
    // Se avisa aunque la barra ya estuviera a la vista: el encabezado de Comunidad vuelve a estar
    // completo en cada reinicio (cambio de pestaña o de sección), y eso no lo dice la visibilidad.
    avisos.forEach(aviso => aviso());
  }, [fijarVisible, avisos]);

  useEffect(() => {
    if (fija) mostrar();
  }, [fija, mostrar]);

  // Al volver a la app, la barra a la vista.
  useEffect(() => {
    const sub = AppState.addEventListener('change', estado => {
      if (estado === 'active') mostrar();
    });
    return () => sub.remove();
  }, [mostrar]);

  const valor = useMemo<BarraInferior>(
    () => ({
      escondida,
      altoQueGana,
      fijarVisible,
      mostrar,
      reinicios: () => reiniciosRef.current,
      estaEscondida: () => !visibleRef.current,
      suscribir,
      fija,
    }),
    [escondida, altoQueGana, fijarVisible, mostrar, suscribir, fija]
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** `null` fuera del proveedor (pruebas de una pantalla suelta): nadie esconde nada. */
export function useBarraInferior(): BarraInferior | null {
  return useContext(Contexto);
}

type AlDesplazar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => void;

/**
 * Lo que se le pasa a un `ScrollView`/`FlatList`/`SectionList` VERTICAL para que la barra se
 * esconda al bajar y vuelva al subir: `<ScrollView {...barraAlDesplazar}>`. Si la lista ya tenía
 * su propio `onScroll`, se le pasa en `opciones.onScroll` y se llama primero.
 *
 * Una sola instancia sirve para varias listas de la misma pantalla siempre que se vea una a la vez
 * (las sub-vistas de Yo o de Plan, las secciones de Comunidad). Para eso está `opciones.vista`:
 * cuando cambia, la barra vuelve a la vista y la medida empieza de cero, igual que al montarse la
 * pantalla. Sin eso, entrar a una sub-vista con la barra escondida la dejaba escondida hasta el
 * primer desplazamiento. No sirve para una lista horizontal: su `y` es siempre 0.
 *
 * El cambio de vista no se puede deducir del desplazamiento: una lista recién montada arranca
 * arriba SIN avisar ningún `onScroll` (en Android basta con poner o quitar el `RefreshControl` para
 * que el `ScrollView` se monte de nuevo). Una pantalla con varias vistas tiene que decirlas en
 * `vista`; si no, el encabezado de Comunidad queda escondido sobre su relleno (E-516, Eventos).
 */
export function useOcultarBarraAlDesplazar(opciones: { onScroll?: AlDesplazar; vista?: unknown } = {}) {
  const barra = useBarraInferior();
  const estado = useRef<EstadoDeLaBarra>(ESTADO_INICIAL);
  const reiniciosVistos = useRef(0);
  const propio = useRef(opciones.onScroll);
  propio.current = opciones.onScroll;

  const mostrar = barra?.mostrar;
  useEffect(() => {
    mostrar?.();
    // Y al salir: volver de una sub-pantalla (Administración, la ficha de un aprendiz) no puede
    // dejar la barra escondida en la pantalla de antes.
    return () => mostrar?.();
  }, [opciones.vista, mostrar]);

  const onScroll = useCallback<AlDesplazar>(
    evento => {
      propio.current?.(evento);
      if (!barra || barra.fija) return;
      // Con el teclado abierto la barra no se toca: se está escribiendo, no leyendo.
      if (Keyboard.isVisible?.()) return;
      const { contentOffset, contentSize, layoutMeasurement } = evento.nativeEvent;
      if (reiniciosVistos.current !== barra.reinicios()) {
        reiniciosVistos.current = barra.reinicios();
        estado.current = { ...ESTADO_INICIAL, ancla: contentOffset.y, ultimaY: contentOffset.y };
      }
      estado.current = siguienteEstadoDeLaBarra(
        estado.current,
        { y: contentOffset.y, altoContenido: contentSize.height, altoVista: layoutMeasurement.height },
        barra.altoQueGana.value
      );
      barra.fijarVisible(estado.current.visible);
    },
    [barra]
  );

  return useMemo(() => ({ onScroll, scrollEventThrottle: 16 }), [onScroll]);
}
