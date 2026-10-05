import React, { useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { desplazamientoParaVerElCampo } from '../../auth/utils/campoBajoElTeclado';

/**
 * El esqueleto de una pantalla del onboarding hecha «de app»: barra arriba, contenido en el medio y
 * el botón principal FIJO abajo (alta y onboarding nativos, 2026-10-05).
 *
 * Lo que tenía cada pantalla del onboarding antes, y por qué se sentía web:
 * - El botón «SIGUIENTE» estaba al final del scroll: había que bajar hasta encontrarlo, y con el
 *   teclado abierto quedaba debajo. Ahora vive fuera del scroll y SUBE con el teclado
 *   (`KeyboardAvoidingView`, el mismo arreglo que ya usan el login, el chat y RENASIA).
 * - «ANTERIOR» y «SIGUIENTE» lado a lado, más un «ANTERIOR» arriba: tres botones para dos
 *   acciones. Ahora atrás es la flecha de arriba (y el gesto/botón atrás de Android, que ya
 *   manejaba cada pantalla), y abajo hay UNA acción.
 * - Cambiar de capítulo reemplazaba la pantalla de golpe, con el scroll donde estaba. Ahora el
 *   contenido de cada paso entra deslizándose desde el lado hacia el que se avanza (desde la
 *   derecha al seguir, desde la izquierda al volver) y arranca arriba de todo.
 *
 * Movimiento: el contenido viejo se va al instante y el nuevo entra 25 px + fundido en 260 ms con
 * ease-out — la sensación de pasar de página sin hacer esperar. La primera vez que se dibuja la
 * pantalla no anima (no hay de dónde venir). Con «reducir movimiento» del sistema no se desliza:
 * sólo un fundido de 160 ms, que sigue explicando que el contenido cambió.
 *
 * **Por qué NO con las animaciones de montaje de Reanimated (`entering={FadeInRight}`)**, que es la
 * herramienta «de libro» para algo que aparece: probado en el emulador el 2026-10-05, con
 * `entering` en este contenedor el selector de fecha de nacimiento (un `<Modal>`) se abría — el
 * lector de pantalla lo encontraba — pero se dibujaba INVISIBLE, y la persona quedaba trabada sin
 * poder elegir la fecha. Sin `entering`, el mismo modal se ve. Lo mismo arriesgaban el selector de
 * país del WhatsApp y el de ubicación. Por eso la entrada va con un valor compartido propio
 * (`EntradaDePaso`), que sólo toca la opacidad y el desplazamiento de este contenedor.
 */
export type DireccionDePaso = 'adelante' | 'atras';

/** Aire bajo el campo enfocado: el del login (20) más los 16 del fundido que avisa el borde. */
const MARGEN_BAJO_EL_CAMPO = 36;
const ALTO_FUNDIDO = 16;

interface MarcoDePasoProps {
  /** Volver. Sin esto no hay flecha (p. ej. «Elige tu Día 1», que no tiene a dónde volver). */
  alVolver?: () => void;
  /** Si viene, el botón de volver muestra esta palabra en vez de la flecha sola (p. ej. «Salir»). */
  etiquetaVolver?: string;
  accesibilidadVolver?: string;
  /** Lo que va arriba al centro (la barra de avance). */
  cabecera?: React.ReactNode;
  /** Cambia cuando cambia el paso: el contenido se vuelve a montar con su entrada animada. */
  claveContenido?: string | number;
  direccion?: DireccionDePaso;
  /** El botón principal. Queda fijo abajo y sube con el teclado. */
  pie: React.ReactNode;
  children: React.ReactNode;
  alternarTema: () => void;
  modoTema: 'light' | 'dark';
}

export function MarcoDePaso({
  alVolver,
  etiquetaVolver,
  accesibilidadVolver = 'Volver al paso anterior',
  cabecera,
  claveContenido = 0,
  direccion = 'adelante',
  pie,
  children,
  alternarTema,
  modoTema,
}: MarcoDePasoProps) {
  const { c, t } = useTheme();
  const { isTablet, contentMaxWidth, horizontalPadding } = useResponsive();
  const insets = useSafeAreaInsets();
  const movimientoReducido = useReducedMotion();

  // La primera vez no hay de dónde venir: el contenido aparece quieto.
  const yaDibujado = useRef(false);
  useEffect(() => {
    yaDibujado.current = true;
  }, []);

  /* Desde dónde entra el paso nuevo: desde la derecha al avanzar, desde la izquierda al volver (el
     camino de ida y el de vuelta son el mismo). Con «reducir movimiento», desde ningún lado. */
  const desdeX = movimientoReducido ? 0 : direccion === 'adelante' ? DESPLAZAMIENTO_ENTRADA : -DESPLAZAMIENTO_ENTRADA;

  /*
   * QUE EL TECLADO NO TAPE EL CAMPO ENFOCADO. Un paso que abre el teclado solo (el nombre, la
   * medicación…) enfoca el campo ANTES de que el teclado suba; Android acomoda el scroll en ese
   * instante, cuando todo se ve, y no vuelve a mirar cuando el área se achica un momento después.
   * Mismo arreglo que el login (`campoBajoElTeclado`): cuando la lista ENCOGE, se la lleva hasta el
   * campo que tiene el foco. El campo se pide a `TextInput.State`, así ningún paso tiene que avisar.
   */
  const lista = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const desplazamiento = useRef(0);
  const altoDeLaLista = useRef(0);

  const alAcomodarLaLista = (evento: LayoutChangeEvent) => {
    const alto = evento.nativeEvent.layout.height;
    const encogio = altoDeLaLista.current > 0 && alto < altoDeLaLista.current;
    altoDeLaLista.current = alto;
    if (!encogio) return;
    const campo = TextInput.State.currentlyFocusedInput();
    const nodo = lista.current?.getNativeScrollRef();
    if (!campo || !nodo || typeof campo.measureInWindow !== 'function') return;
    nodo.measureInWindow((_x, listaY) => {
      campo.measureInWindow((_cx, campoY, _cAncho, campoAlto) => {
        const destino = desplazamientoParaVerElCampo(
          { y: campoY, alto: campoAlto },
          { y: listaY, alto },
          desplazamiento.current,
          MARGEN_BAJO_EL_CAMPO,
        );
        if (destino !== null) lista.current?.scrollTo({ y: destino, animated: true });
      });
    });
  };

  const anchoContenido = {
    paddingHorizontal: horizontalPadding,
    maxWidth: contentMaxWidth,
    alignSelf: isTablet ? ('center' as const) : ('stretch' as const),
    width: isTablet ? ('100%' as const) : undefined,
  };

  return (
    <SafeAreaView style={[styles.raiz, { backgroundColor: c.bg }]}>
      <View style={[styles.barra, { paddingHorizontal: horizontalPadding }]}>
        {alVolver ? (
          <Presionable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={accesibilidadVolver}
            onPress={alVolver}
            style={[
              etiquetaVolver ? styles.volverConTexto : styles.volver,
              { borderColor: c.border, backgroundColor: c.cardBgAlt },
            ]}
          >
            <Icon name="arrowLeft" size={18} color={c.goldInk} />
            {etiquetaVolver ? (
              <Text style={[t.body, styles.textoVolver, { color: c.text }]}>{etiquetaVolver}</Text>
            ) : null}
          </Presionable>
        ) : (
          // Sin a dónde volver: un hueco del mismo ancho, para que la barra del centro no se corra.
          <View style={styles.huecoVolver} />
        )}

        <View style={styles.centro}>{cabecera}</View>

        <Presionable
          hitSlop={6}
          onPress={alternarTema}
          accessibilityRole="button"
          accessibilityLabel={modoTema === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
          style={[styles.tema, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name={modoTema === 'light' ? 'moon' : 'sun'} size={16} color={c.goldInk} />
        </Presionable>
      </View>

      {/*
        `behavior` en las dos plataformas y `insets.top` en Android: el mismo arreglo del login
        (`LoginScreen`, bloque «QUE EL TECLADO NO TAPE EL CAMPO…»). Con edge-to-edge obligatorio la
        ventana ya no se encoge sola al abrir el teclado, y sin esto el botón fijo quedaría debajo.
      */}
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
        style={styles.raiz}
      >
        <EntradaDePaso
          key={claveContenido}
          animar={yaDibujado.current}
          desdeX={desdeX}
          duracion={movimientoReducido ? DURACION_MS.fundido : DURACION_MS.paso}
        >
          <ScrollView
            ref={lista}
            contentContainerStyle={[styles.contenido, anchoContenido]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onLayout={alAcomodarLaLista}
            onScroll={e => {
              desplazamiento.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            {children}
          </ScrollView>
          {/* Fundido sobre el borde de abajo: avisa que hay más contenido sin una raya dura. */}
          <LinearGradient
            pointerEvents="none"
            colors={[`${c.bg}00`, c.bg]}
            style={styles.fundidoInferior}
          />
        </EntradaDePaso>

        <View style={[styles.pie, anchoContenido]}>{pie}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Cuánto se corre el paso nuevo al entrar (el mismo recorrido que `FadeInRight` de Reanimated). */
const DESPLAZAMIENTO_ENTRADA = 25;

/**
 * El contenedor de un paso, que entra con opacidad + desplazamiento corto. Se monta de nuevo en cada
 * paso (va con `key`), y el valor arranca en 0 desde que se crea: así el primer cuadro ya sale
 * transparente, sin un parpadeo del paso entero antes de empezar a entrar. Todo en el hilo de la
 * interfaz (`withTiming`); React no se vuelve a dibujar durante la animación.
 */
function EntradaDePaso({
  animar,
  desdeX,
  duracion,
  children,
}: {
  animar: boolean;
  desdeX: number;
  duracion: number;
  children: React.ReactNode;
}) {
  const progreso = useSharedValue(animar ? 0 : 1);

  useEffect(() => {
    if (!animar) return;
    progreso.set(withTiming(1, { duration: duracion, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.Never }));
    // Sólo al montar: cada paso nuevo es un montaje nuevo (`key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estilo = useAnimatedStyle(() => ({
    opacity: progreso.get(),
    transform: [{ translateX: (1 - progreso.get()) * desdeX }],
  }));

  return <Animated.View style={[styles.raiz, estilo]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 56,
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
  },
  volver: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  huecoVolver: {
    width: 44,
    height: 44,
  },
  volverConTexto: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoVolver: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14.5,
    lineHeight: 20,
  },
  tema: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 28,
  },
  fundidoInferior: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: ALTO_FUNDIDO,
  },
  pie: {
    paddingTop: 8,
    paddingBottom: 12,
  },
});
