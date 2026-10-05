import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../theme/movimiento';
import { Icon } from '../Icon';
import {
  CURVA_CAJON,
  DURACION_HOJA_MS,
  UMBRAL_PARA_ARRASTRAR,
  decidirAlSoltar,
  opacidadDelVelo,
  posicionAlArrastrar,
} from './logicaDeLaHoja';

/**
 * Una hoja que sube desde abajo, como las del sistema (selectores de la Ficha Inicial, 2026-10-05).
 *
 * Reemplaza a las tarjetas centradas con borde dorado y botón «CERRAR» que usaban la fecha de
 * nacimiento, el código de país y la ubicación: un diálogo de página web dentro de una app. Una
 * sola hoja para los tres, para que se comporten igual.
 *
 * **Cómo se cierra.** Arrastrándola hacia abajo desde la agarradera o la cabecera, tocando el fondo
 * oscuro, con la ✕ (44 × 44), con el atrás de Android (`onRequestClose`), con Escape en la web y
 * con el gesto de escape de VoiceOver. Todos esos caminos llaman a `alCerrar`; quien la usa pone
 * `visible` en `false` y la hoja baja antes de desmontarse.
 *
 * **Movimiento** (`emil-design-eng`, `animate-expo`, `apple-design`):
 * - Entra en 280 ms con la curva del cajón de iOS; sale en 200 ms (la salida, más corta).
 * - El arrastre sigue al dedo 1:1 hacia abajo y con resistencia hacia arriba. Al soltar se cierra
 *   si bajó un cuarto de su alto **o** si fue un golpe rápido (`decidirAlSoltar`), y en los dos
 *   casos termina con un resorte que arranca a la velocidad del dedo: sin costura entre el dedo y
 *   la animación. Si no, vuelve con el mismo resorte, sin pasarse del borde de abajo.
 * - El fondo se oscurece en proporción a cuánto se ve la hoja: al arrastrarla, se aclara.
 * - Con «reducir movimiento» del sistema no se desliza: entra y sale con un fundido de 160 ms.
 * - Todo va en valores compartidos de Reanimated, en el hilo de la interfaz.
 *
 * **Por qué el arrastre usa `PanResponder` y no Gesture Handler.** `react-native-gesture-handler`
 * no está instalado y trae código nativo: agregarlo obliga a un APK nuevo con prebuild y a que el
 * cliente de desarrollo del emulador se reconstruya, o la app revienta al importarlo. El arrastre
 * vive solo en la cabecera, y lo que se anima (posición, velo, resorte) igual corre en el hilo de
 * la interfaz; lo único que pasa por JavaScript es leer el dedo. Si algún día se instala Gesture
 * Handler, se cambia acá adentro y ningún selector se entera.
 *
 * **El teclado.** La hoja va dentro de un `KeyboardAvoidingView` en la raíz del `Modal` (que ocupa
 * la pantalla entera: `statusBarTranslucent`), así que con el teclado abierto su borde de abajo
 * queda encima del teclado y la lista se acorta; el buscador, arriba, queda siempre a la vista.
 */

export interface HojaDesdeAbajoProps {
  visible: boolean;
  /** La persona pidió cerrarla (gesto, fondo, ✕, atrás). Quien la usa debe poner `visible` en `false`. */
  alCerrar: () => void;
  /**
   * Ya se fue del todo: terminó de bajar y su `Modal` se desmontó. Para lo que no puede pasar con la
   * hoja todavía encima. En Android, enfocar un campo de la pantalla de abajo mientras el `Modal`
   * sigue en pantalla deja el cursor puesto y el teclado cerrado: la ventana con el foco es la del
   * `Modal`, y el sistema ignora el pedido de abrir el teclado (visto en el emulador, 2026-10-05).
   */
  alTerminarDeCerrar?: () => void;
  titulo: string;
  /** Una línea bajo el título; p. ej. la fecha que se está eligiendo, en vivo. */
  subtitulo?: string;
  /**
   * `contenido`: tan alta como lo que lleva (la fecha). `grande`: casi toda la pantalla, siempre
   * igual de alta, para las listas con buscador (filtrar no la hace saltar).
   */
  tamano?: 'contenido' | 'grande';
  /** Lo que va pegado al título y también sirve para arrastrar la hoja (el buscador). */
  bajoElTitulo?: React.ReactNode;
  /** Lo que va fijo abajo (el botón «Listo»). */
  pie?: React.ReactNode;
  etiquetaCerrar?: string;
  /**
   * Una hoja con pasos (la de Planificar de Training, 2026-10-05): con esto, una ‹ a la izquierda del
   * título vuelve al paso anterior, y el atrás de Android también vuelve en vez de cerrar la hoja. La
   * ✕, el fondo y el arrastre siguen cerrándola entera. Sin esta prop la hoja es la de siempre.
   */
  alVolver?: () => void;
  etiquetaVolver?: string;
  children: React.ReactNode;
}

/** En la web, arrastrar la cabecera con el mouse seleccionaba el título como texto. */
const SIN_SELECCION_EN_WEB = (Platform.OS === 'web' ? { userSelect: 'none' } : null) as object | null;

/** Lo que queda de fondo oscuro arriba de una hoja `grande`: que se lea como hoja, no como pantalla. */
const AIRE_ARRIBA_GRANDE = 40;
const ANCHO_MAXIMO = 560;
/** Lo que se espera en Android, ya desmontado el `Modal`, para avisar que la hoja se fue (`alTerminarDeCerrar`). */
export const ESPERA_VENTANA_ANDROID_MS = 150;

export function HojaDesdeAbajo(props: HojaDesdeAbajoProps) {
  const { visible, alCerrar } = props;
  /*
   * MIENTRAS BAJA, SE VE LO ÚLTIMO QUE MOSTRÓ ABIERTA. Quien la usa suele limpiar su estado al
   * cerrar (la búsqueda, la lista, el título del nivel de ubicación); sin esto, durante los 200 ms
   * de la salida la hoja cambiaba de contenido a medio camino — visto en la captura del distrito:
   * bajaba sin título y con la lista vacía. Se guarda el árbol de la última vez que estuvo abierta.
   */
  const ultimaAbierta = useRef(props);
  if (visible) ultimaAbierta.current = props;
  const {
    titulo,
    subtitulo,
    tamano = 'contenido',
    bajoElTitulo,
    pie,
    etiquetaCerrar = 'Cerrar',
    alVolver,
    etiquetaVolver = 'Volver',
    children,
  } = ultimaAbierta.current;
  const alVolver$ = useRef(props.alVolver);
  alVolver$.current = props.alVolver;

  const { c, t, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: altoVentana } = useWindowDimensions();
  const reducido = useReducedMotion();

  const [presente, setPresente] = useState(visible);
  /** Desplazamiento hacia abajo de la hoja: 0 es abierta, su alto es afuera. Arranca afuera. */
  const y = useSharedValue(altoVentana);
  /** El fundido de «reducir movimiento». Sin esa preferencia queda en 1 todo el tiempo. */
  const opacidad = useSharedValue(1);
  const alto = useSharedValue(0);
  const medida = useRef(false);
  const saliendo = useRef(false);
  const titulo$ = useRef<Text>(null);
  const reducido$ = useRef(reducido);
  reducido$.current = reducido;
  const alCerrar$ = useRef(alCerrar);
  alCerrar$.current = alCerrar;
  const alTerminarDeCerrar$ = useRef(props.alTerminarDeCerrar);
  alTerminarDeCerrar$.current = props.alTerminarDeCerrar;
  const estabaPresente = useRef(presente);

  const desmontar = () => {
    if (!saliendo.current) return;
    saliendo.current = false;
    setPresente(false);
  };

  const animarEntrada = (desdeAfuera: boolean) => {
    if (reducido$.current) {
      cancelAnimation(y);
      y.set(0);
      if (desdeAfuera) opacidad.set(0);
      opacidad.set(withTiming(1, { duration: DURACION_MS.fundido, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.Never }));
      return;
    }
    opacidad.set(1);
    if (desdeAfuera) y.set(alto.get());
    y.set(withTiming(0, { duration: DURACION_HOJA_MS.entrada, easing: CURVA_CAJON, reduceMotion: ReduceMotion.Never }));
  };

  const alTerminarSalida = (terminado?: boolean) => {
    'worklet';
    if (terminado) scheduleOnRN(desmontar);
  };

  const animarSalida = (velocidad?: number) => {
    saliendo.current = true;
    Keyboard.dismiss();
    if (reducido$.current) {
      opacidad.set(
        withTiming(0, { duration: DURACION_MS.fundido, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.Never }, alTerminarSalida),
      );
      return;
    }
    const destino = alto.get() > 0 ? alto.get() : altoVentana;
    y.set(
      velocidad === undefined
        ? withTiming(destino, { duration: DURACION_HOJA_MS.salida, easing: CURVA_CAJON, reduceMotion: ReduceMotion.Never }, alTerminarSalida)
        : withSpring(
            destino,
            {
              duration: DURACION_HOJA_MS.resorte,
              dampingRatio: 1,
              overshootClamping: true,
              velocity: velocidad * 1000,
              reduceMotion: ReduceMotion.Never,
            },
            alTerminarSalida,
          ),
    );
  };

  useEffect(() => {
    if (visible) {
      saliendo.current = false;
      if (!presente) {
        medida.current = false;
        y.set(altoVentana);
        setPresente(true);
      } else if (medida.current) {
        // Se volvió a abrir mientras bajaba: sube desde donde está, sin saltar.
        animarEntrada(false);
      }
    } else if (presente && !saliendo.current) {
      animarSalida();
    }
    // Sólo reacciona a que se abra o se cierre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* Recién cuando el `Modal` ya no está se avisa que se fue. En Android, además, se espera a que la
     ventana de abajo recupere el foco: el `Modal` es otra ventana del sistema, se cierra después de
     que React lo desmonta, y un campo enfocado antes de eso se queda sin teclado. Medido en el
     emulador: enfocando al desmontar, el teclado no se abría; 100 ms después, 3 de 3 veces sí. */
  useEffect(() => {
    const seFue = estabaPresente.current && !presente;
    estabaPresente.current = presente;
    if (!seFue) return undefined;
    if (Platform.OS !== 'android') {
      alTerminarDeCerrar$.current?.();
      return undefined;
    }
    const reloj = setTimeout(() => alTerminarDeCerrar$.current?.(), ESPERA_VENTANA_ANDROID_MS);
    return () => clearTimeout(reloj);
  }, [presente]);

  const alMedir = (evento: LayoutChangeEvent) => {
    alto.set(evento.nativeEvent.layout.height);
    if (medida.current) return;
    medida.current = true;
    animarEntrada(true);
    enfocarElTitulo(titulo$.current);
  };

  /* ARRASTRAR PARA CERRAR. Solo la cabecera (agarradera, título, buscador): la lista de abajo
     tiene su propio desplazamiento y pelearían por el mismo dedo. La ✕ y el buscador siguen
     recibiendo sus toques: son más profundos, así que se los quedan ellos.

     LA CABECERA TOMA EL DEDO AL APOYARLO, no recién al moverlo 6 px. El `Modal` de React Native
     envuelve su contenido en una vista que reclama el toque al empezar si nadie más lo hizo
     (`onStartShouldSetResponder` → `true`, para que no atraviese el modal). Esa vista es antecesora
     de la cabecera, y una vez dueña del gesto el sistema de respuesta no le vuelve a preguntar a
     ningún descendiente en cada movimiento: en Android la hoja no seguía al dedo ni se cerraba al
     bajarla (visto en el emulador el 2026-10-05; en la web no pasaba porque react-native-web no
     tiene ese contenedor). Un toque sin arrastre se trata en `onPanResponderRelease`. */
  const arrastre = useMemo(() => {
    let base = 0;
    let inicio = 0;
    const volver = (velocidad: number) => {
      y.set(
        reducido$.current
          ? withTiming(0, { duration: DURACION_MS.fundido, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.Never })
          : withSpring(0, {
              duration: DURACION_HOJA_MS.resorte,
              dampingRatio: 0.8,
              overshootClamping: true,
              velocity: velocidad * 1000,
              reduceMotion: ReduceMotion.Never,
            }),
      );
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > UMBRAL_PARA_ARRASTRAR && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        cancelAnimation(y);
        base = Math.max(0, y.get());
        inicio = Date.now();
      },
      onPanResponderMove: (_e, g) => {
        y.set(posicionAlArrastrar(base + g.dy, alto.get()));
      },
      onPanResponderRelease: (_e, g) => {
        /* Un toque en el título o la agarradera no es un arrastre: si llegó durante la entrada,
           `base` es lo que faltaba subir y no debe leerse como «la bajaron un cuarto». */
        if (Math.abs(g.dy) <= UMBRAL_PARA_ARRASTRAR && Math.abs(g.dx) <= UMBRAL_PARA_ARRASTRAR) {
          volver(0);
          return;
        }
        const decision = decidirAlSoltar({
          desplazamiento: base + g.dy,
          msTranscurridos: Date.now() - inicio,
          velocidadFinal: g.vy,
          altoHoja: alto.get(),
        });
        if (decision === 'cerrar') {
          animarSalida(Math.max(0, g.vy));
          alCerrar$.current();
        } else {
          volver(g.vy);
        }
      },
      onPanResponderTerminate: (_e, g) => volver(g.vy),
      onPanResponderTerminationRequest: () => false,
    });
    // Los valores compartidos y las refs son estables; lo demás se lee por ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estiloVelo = useAnimatedStyle(() => ({
    opacity: opacidad.get() * opacidadDelVelo(y.get(), alto.get() > 0 ? alto.get() : altoVentana),
  }));
  const estiloHoja = useAnimatedStyle(() => ({
    opacity: opacidad.get(),
    transform: [{ translateY: y.get() }],
  }));

  if (!presente) return null;

  const colorVelo = mode === 'dark' ? 'rgba(0,0,0,0.62)' : 'rgba(17,16,13,0.42)';
  const altoGrande = altoVentana - insets.top - AIRE_ARRIBA_GRANDE;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => (alVolver$.current ? alVolver$.current() : alCerrar$.current())}
    >
      <View style={styles.raiz}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colorVelo }, estiloVelo]}>
          {/* Tocar fuera cierra. Fuera del árbol de accesibilidad: para eso está la ✕, con nombre. */}
          <Pressable
            testID="hoja-fondo"
            style={StyleSheet.absoluteFill}
            onPress={() => alCerrar$.current()}
            accessible={false}
            importantForAccessibility="no"
            focusable={false}
          />
        </Animated.View>

        <KeyboardAvoidingView behavior="padding" style={[styles.raiz, styles.dejaPasar, { paddingTop: insets.top + 8 }]}>
          <View style={[styles.anclaAbajo, styles.dejaPasar]}>
            <Animated.View
              accessibilityViewIsModal
              onAccessibilityEscape={() => alCerrar$.current()}
              onLayout={alMedir}
              style={[
                styles.hoja,
                {
                  backgroundColor: c.cardBg,
                  borderColor: mode === 'dark' ? c.border : 'transparent',
                  height: tamano === 'grande' ? altoGrande : undefined,
                },
                estiloHoja,
              ]}
            >
              <View {...arrastre.panHandlers} style={[styles.cabecera, SIN_SELECCION_EN_WEB]}>
                <View style={styles.zonaAgarradera}>
                  <View style={[styles.agarradera, { backgroundColor: c.borderStrong }]} />
                </View>
                <View style={styles.filaTitulo}>
                  {alVolver ? (
                    <Pressable
                      onPress={() => alVolver$.current?.()}
                      accessibilityRole="button"
                      accessibilityLabel={etiquetaVolver}
                      style={({ pressed }) => [styles.volver, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      {/* El chevron del proyecto apunta a la derecha: se rota, como en `CabeceraAdmin`. */}
                      <View style={{ transform: [{ rotate: '180deg' }] }}>
                        <Icon name="chevron" size={20} color={c.textSoft} />
                      </View>
                    </Pressable>
                  ) : null}
                  <View style={styles.textos}>
                    <Text
                      ref={titulo$}
                      accessibilityRole="header"
                      numberOfLines={2}
                      style={[t.cardTitle, styles.titulo, { color: c.textStrong }]}
                    >
                      {titulo}
                    </Text>
                    {subtitulo ? (
                      <Text style={[t.small, { color: c.textSoft }]} numberOfLines={1}>
                        {subtitulo}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => alCerrar$.current()}
                    accessibilityRole="button"
                    accessibilityLabel={etiquetaCerrar}
                    style={({ pressed }) => [styles.cerrar, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <View style={[styles.circuloCerrar, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                      <Icon name="close" size={14} color={c.textSoft} strokeWidth={1.8} />
                    </View>
                  </Pressable>
                </View>
                {bajoElTitulo}
              </View>

              <View style={tamano === 'grande' ? styles.cuerpoGrande : undefined}>{children}</View>

              {pie ? <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{pie}</View> : null}
              {!pie && tamano === 'contenido' ? <View style={{ height: Math.max(insets.bottom, 12) }} /> : null}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/**
 * Con lector de pantalla, el foco va al título al abrir: así se anuncia qué se está eligiendo. En la
 * web no hace falta (el `Modal` de react-native-web ya mueve y encierra el foco).
 */
function enfocarElTitulo(titulo: Text | null) {
  if (Platform.OS === 'web' || !titulo) return;
  setTimeout(() => {
    try {
      AccessibilityInfo.sendAccessibilityEvent(titulo, 'focus');
    } catch {
      // Sin lector de pantalla o en una plataforma que no lo soporta: no hay nada que enfocar.
    }
  }, DURACION_HOJA_MS.entrada);
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  /** Los toques fuera de la hoja atraviesan estas capas y llegan al fondo (que cierra). */
  dejaPasar: {
    pointerEvents: 'box-none',
  },
  anclaAbajo: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  hoja: {
    width: '100%',
    maxWidth: ANCHO_MAXIMO,
    maxHeight: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  cabecera: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 10,
  },
  zonaAgarradera: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  agarradera: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: 18,
    lineHeight: 24,
  },
  volver: {
    width: 44,
    height: 44,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrar: {
    width: 44,
    height: 44,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloCerrar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpoGrande: {
    flex: 1,
  },
  pie: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
